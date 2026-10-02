from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import AuditLog, Notification, User


def add_notification(db: Session, user_id: UUID, kind: str, message: str) -> None:
    db.add(Notification(user_id=user_id, kind=kind, message=message))


def notify_system_admins(db: Session, kind: str, message: str) -> None:
    for user_id in db.scalars(select(User.id).where(User.role == 'SYSTEM_ADMIN')).all():
        add_notification(db, user_id, kind, message)


def add_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str | int,
    actor_id: UUID | None = None,
    company_id: int | None = None,
    details: str | None = None,
) -> None:
    db.add(AuditLog(
        actor_id=actor_id,
        company_id=company_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details,
    ))
