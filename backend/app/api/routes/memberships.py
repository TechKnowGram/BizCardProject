from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from app.api.deps import get_current_user, require_approved_company_admin, require_roles
from app.db.session import get_db
from app.models import CardOrder, Company, Employee, Membership, User
from app.models.constants import COMPANY_ADMIN, EMPLOYEE
from app.schemas.domain import CompanyDirectoryResponse, MembershipDecision, MembershipRequest, MembershipResponse
from app.services.activity import add_audit, add_notification

router = APIRouter(tags=['Memberships'])


def membership_query():
    return select(Membership).options(selectinload(Membership.company), selectinload(Membership.user), selectinload(Membership.employee))


@router.get('/companies/directory', response_model=list[CompanyDirectoryResponse])
def company_directory(db: Session = Depends(get_db), _: User = Depends(require_roles([EMPLOYEE]))):
    return db.scalars(select(Company).where(Company.status == 'APPROVED').order_by(Company.name)).all()


@router.post('/memberships/{company_id}', response_model=MembershipResponse, status_code=201)
def request_membership(company_id: int, body: MembershipRequest, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    company = db.get(Company, company_id)
    if company is None or company.status != 'APPROVED':
        raise HTTPException(404, 'Company not found')
    existing = db.scalar(select(Membership).where(Membership.company_id == company_id, Membership.user_id == user.id))
    if existing:
        raise HTTPException(409, f'Membership is already {existing.status.lower()}')

    submitted_email = str(body.official_email).lower().strip()
    submitted_code = body.employee_id.strip()

    # Try exact roster match: company_id + employee_id + email
    employee = db.scalar(select(Employee).where(
        Employee.company_id == company_id,
        Employee.employee_id == submitted_code,
        Employee.email == submitted_email))

    if employee and employee.is_active:
        # Scenario A: Exact match with active employee
        # Check for PRE_APPROVED membership
        preapproved = db.scalar(select(Membership).where(
            Membership.company_id == company_id,
            Membership.employee_id == employee.id,
            Membership.user_id.is_(None),
            Membership.status == 'PRE_APPROVED'))
        if preapproved:
            preapproved.user_id = user.id
            preapproved.status = 'APPROVED'
            preapproved.match_status = 'ROSTER_MATCHED'
            preapproved.decided_at = datetime.now(timezone.utc)
            add_notification(db, user.id, 'MEMBERSHIP_APPROVED', f'Your pre-approved membership for {company.name} is now active.')
            db.commit()
            return db.scalar(membership_query().where(Membership.id == preapproved.id))

        # Check if this employee record is already linked to another membership
        linked = db.scalar(select(Membership).where(Membership.company_id == company_id, Membership.employee_id == employee.id))
        if linked:
            raise HTTPException(409, 'This employee record is already linked to another account')

        # Auto-approve: roster verified
        membership = Membership(company_id=company_id, user_id=user.id, employee_id=employee.id,
                                status='APPROVED', official_email=submitted_email,
                                employee_code=submitted_code, payer=body.payer,
                                match_status='ROSTER_MATCHED',
                                decided_at=datetime.now(timezone.utc))
        db.add(membership)
        db.flush()
        add_notification(db, user.id, 'MEMBERSHIP_APPROVED', f'Your membership for {company.name} has been automatically verified and activated.')
        add_audit(db, 'MEMBERSHIP_AUTO_APPROVED', 'membership', membership.id, user.id, company_id, 'Roster match')
        db.commit()
        return db.scalar(membership_query().where(Membership.id == membership.id))

    # Determine match_status for non-exact scenarios
    if employee and not employee.is_active:
        # Scenario D: Employee found but inactive
        match_status = 'INACTIVE_EMPLOYEE'
    else:
        # Check if employee_id exists but email doesn't match
        id_match = db.scalar(select(Employee).where(
            Employee.company_id == company_id,
            Employee.employee_id == submitted_code))
        if id_match:
            # Scenario C: Employee ID found but email mismatch
            match_status = 'ID_MISMATCH'
        else:
            # Scenario B: No matching employee record at all
            match_status = 'NOT_FOUND'

    # Create PENDING membership for manual review (no employee_id link)
    membership = Membership(company_id=company_id, user_id=user.id, employee_id=None,
                            status='PENDING', official_email=submitted_email,
                            employee_code=submitted_code, payer=body.payer,
                            match_status=match_status)
    db.add(membership)
    db.flush()
    for admin in db.scalars(select(User).where(User.company_id == company_id, User.role == COMPANY_ADMIN)):
        add_notification(db, admin.id, 'MEMBERSHIP_REQUEST', f'{user.username} requested to join your company ({match_status.replace("_", " ").lower()}).')
    add_audit(db, 'MEMBERSHIP_REQUESTED', 'membership', membership.id, user.id, company_id, match_status)
    db.commit()
    return db.scalar(membership_query().where(Membership.id == membership.id))


@router.get('/memberships/me', response_model=list[MembershipResponse])
def my_memberships(db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    return db.scalars(membership_query().where(Membership.user_id == user.id).order_by(Membership.id.desc())).all()


@router.get('/company/memberships', response_model=list[MembershipResponse])
def company_memberships(db: Session = Depends(get_db), user: User = Depends(require_approved_company_admin)):
    return db.scalars(membership_query().where(Membership.company_id == user.company_id).order_by(Membership.id.desc())).all()


@router.get('/company/card-orders')
def company_card_orders(db: Session = Depends(get_db), user: User = Depends(require_approved_company_admin)):
    orders = db.scalars(select(CardOrder).where(CardOrder.company_id == user.company_id).order_by(CardOrder.id.desc())).all()
    return [{'id': order.id, 'quantity': order.quantity, 'unit_price': order.unit_price,
             'total_amount': order.total_amount, 'payer': order.payer, 'status': order.status,
             'created_at': order.created_at} for order in orders]


@router.patch('/company/memberships/{membership_id}', response_model=MembershipResponse)
def decide_membership(membership_id: int, body: MembershipDecision, db: Session = Depends(get_db), admin: User = Depends(require_approved_company_admin)):
    membership = db.scalar(membership_query().where(Membership.id == membership_id, Membership.company_id == admin.company_id).with_for_update())
    if membership is None:
        raise HTTPException(404, 'Membership not found')
    if body.decision == 'APPROVED':
        if membership.status == 'APPROVED':
            return membership
        if membership.status != 'PENDING':
            raise HTTPException(409, f'Membership is already {membership.status.lower()}')
        if membership.employee_id is None:
            emp = db.scalar(select(Employee).where(
                Employee.company_id == admin.company_id,
                Employee.employee_id == membership.employee_code,
            ))
            if emp is None:
                emp = Employee(
                    company_id=admin.company_id,
                    employee_id=membership.employee_code,
                    name=membership.user.username if membership.user else 'Employee',
                    designation='Staff',
                    department='General',
                    email=membership.official_email,
                    phone='',
                    is_active=True,
                )
                db.add(emp)
                db.flush()
            else:
                linked = db.scalar(select(Membership).where(
                    Membership.company_id == admin.company_id,
                    Membership.employee_id == emp.id,
                    Membership.id != membership.id,
                ))
                if linked:
                    raise HTTPException(409, 'This employee record is already linked to another account')
                emp.is_active = True
            membership.employee_id = emp.id
        else:
            if membership.employee:
                membership.employee.is_active = True
    elif body.decision == 'REVOKED':
        if membership.status != 'APPROVED':
            raise HTTPException(409, 'Only an approved membership can be revoked')
        if membership.employee:
            membership.employee.is_active = False
    elif membership.status != 'PENDING':
        raise HTTPException(409, f'Membership is already {membership.status.lower()}')
    membership.status = body.decision
    membership.decided_at = datetime.now(timezone.utc)
    add_notification(db, membership.user_id, f'MEMBERSHIP_{body.decision}', f'Your membership request was {body.decision.lower()}.')
    add_audit(db, f'MEMBERSHIP_{body.decision}', 'membership', membership.id, admin.id, admin.company_id)
    db.commit()
    return db.scalar(membership_query().where(Membership.id == membership.id))
