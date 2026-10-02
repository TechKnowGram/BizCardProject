from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.api.deps import require_system_admin
from app.db.session import get_db
from app.models import Company, User
from app.schemas.domain import CompanyResponse, CompanyStatusUpdate
from app.services.activity import add_audit, add_notification

router = APIRouter(prefix='/admin/companies', tags=['System Admin - Companies'])


@router.get('', response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return db.scalars(select(Company).options(selectinload(Company.admins)).order_by(Company.id)).all()


@router.patch('/{company_id}/status', response_model=CompanyResponse)
def update_company_status(
    company_id: int,
    body: CompanyStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_system_admin),
):
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail='Company not found')
    if body.status == 'REJECTED' and not (body.reason or '').strip():
        raise HTTPException(status_code=422, detail='A rejection reason is required')
    company.status = body.status
    company.rejection_reason = body.reason.strip() if body.status == 'REJECTED' and body.reason else None
    for owner in company.admins:
        add_notification(
            db, owner.id, f'COMPANY_{body.status}',
            f'{company.name} was {body.status.lower()}.' + (f' Reason: {company.rejection_reason}' if company.rejection_reason else ''),
        )
    add_audit(db, f'COMPANY_{body.status}', 'company', company.id, admin.id, company.id, company.rejection_reason)
    db.commit()
    db.refresh(company)
    return company
