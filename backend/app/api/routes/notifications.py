from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_system_admin
from app.db.session import get_db
from app.models import AuditLog, CardRequest, Company, Employee, GeneratedCard, Notification, User
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
    }
