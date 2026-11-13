from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload
from app.api.deps import get_current_user, require_system_admin
from app.db.session import get_db
from app.models import AuditLog, CardOrder, CardRequest, Company, Employee, GeneratedCard, Membership, Notification, User
from app.schemas.domain import AuditLogResponse, NotificationResponse

router = APIRouter(tags=['Notifications and Audit'])


@router.get('/notifications', response_model=list[NotificationResponse])
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc()).limit(30)).all()


@router.patch('/notifications/item/{notification_id}/read', response_model=NotificationResponse)
def read_notification(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    if item is None:
        raise HTTPException(status_code=404, detail='Notification not found')
    item.is_read = True
    db.commit(); db.refresh(item)
    return item


@router.patch('/notifications/read-all')
def read_all_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(is_read=True))
    db.commit()
    return {'ok': True}


@router.get('/admin/audit-logs', response_model=list[AuditLogResponse])
def list_audit_logs(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(100)).all()


@router.get('/admin/stats')
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return {
        'companies': db.scalar(select(func.count()).select_from(Company)) or 0,
        'pending_companies': db.scalar(select(func.count()).select_from(Company).where(Company.status == 'PENDING')) or 0,
        'employees': db.scalar(select(func.count()).select_from(Employee).where(Employee.is_active.is_(True))) or 0,
        'pending_requests': db.scalar(select(func.count()).select_from(CardRequest).where(CardRequest.status == 'PENDING')) or 0,
        'generated_cards': db.scalar(select(func.count()).select_from(GeneratedCard)) or 0,
        'total_users': db.scalar(select(func.count()).select_from(User)) or 0,
        'total_orders': db.scalar(select(func.count()).select_from(CardOrder)) or 0,
        'total_revenue': db.scalar(select(func.sum(CardOrder.total_amount))) or 0,
    }


@router.get('/admin/users')
def list_admin_users(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    users = db.scalars(select(User).options(selectinload(User.company)).order_by(User.username)).all()
    return [{
        'id': str(u.id),
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'company_id': u.company_id,
        'company_name': u.company.name if u.company else None,
    } for u in users]


@router.get('/admin/memberships')
def list_admin_memberships(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    items = db.scalars(select(Membership).options(selectinload(Membership.company), selectinload(Membership.user), selectinload(Membership.employee)).order_by(Membership.id.desc())).all()
    return [{
        'id': m.id,
        'company_id': m.company_id,
        'company_name': m.company.name if m.company else None,
        'user_id': str(m.user_id) if m.user_id else None,
        'username': m.user.username if m.user else None,
        'official_email': m.official_email,
        'employee_code': m.employee_code,
        'payer': m.payer,
        'status': m.status,
        'match_status': m.match_status,
        'requested_at': m.requested_at.isoformat() if m.requested_at else None,
        'decided_at': m.decided_at.isoformat() if m.decided_at else None,
    } for m in items]


@router.get('/admin/payments')
def list_admin_payments(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    orders = db.scalars(select(CardOrder).options(selectinload(CardOrder.company)).order_by(CardOrder.id.desc())).all()
    return [{
        'id': o.id,
        'company_id': o.company_id,
        'company_name': o.company.name if o.company else 'Individual / Personal',
        'quantity': o.quantity,
        'unit_price': o.unit_price,
        'total_amount': o.total_amount,
        'payer': o.payer,
        'status': o.status,
        'created_at': o.created_at.isoformat() if o.created_at else None,
    } for o in orders]
