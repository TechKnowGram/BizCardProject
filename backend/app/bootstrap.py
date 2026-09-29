from pydantic import ValidationError
from sqlalchemy import select, text
from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal
from app.models import CardTemplate, User
from app.models.constants import SYSTEM_ADMIN
from app.schemas.auth import SystemAdminCredentials

DEFAULT_TEMPLATES = (
    ('Classic', 'Traditional, formal business card', 'classic'),
    ('Modern', 'Bold color and contemporary layout', 'modern'),
    ('Minimal', 'Clean typography with generous spacing', 'minimal'),
)


def create_system_admin(db, credentials: SystemAdminCredentials):
    existing = db.scalar(select(User).where(User.role == SYSTEM_ADMIN))
    if existing:
        return existing
    email = str(credentials.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise RuntimeError('SYSTEM_ADMIN_EMAIL already belongs to another user')
    admin = User(
        username=credentials.username.strip(),
        email=email,
        password_hash=hash_password(credentials.password),
        role=SYSTEM_ADMIN,
        company_id=None,
    )
    db.add(admin)
    db.flush()
    return admin


def seed_templates(db):
    existing = set(db.scalars(select(CardTemplate.style_key)).all())
    for name, description, style_key in DEFAULT_TEMPLATES:
        if style_key not in existing:
            db.add(CardTemplate(name=name, description=description, style_key=style_key, is_active=True))


def initialize_application():
    try:
        credentials = SystemAdminCredentials(
            username=settings.system_admin_username,
            email=settings.system_admin_email,
            password=settings.system_admin_password.get_secret_value(),
        )
    except ValidationError:
        raise RuntimeError(
            'Set SYSTEM_ADMIN_USERNAME, SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD '
            '(8-128 characters) in backend/app/.env.'
        ) from None

    with SessionLocal() as db:
        if db.get_bind().dialect.name == 'postgresql':
            db.execute(text('SELECT pg_advisory_xact_lock(7241901)'))
        # Alembic is authoritative in deployment; this keeps first local startup beginner-friendly.
        Base.metadata.create_all(db.connection())
        create_system_admin(db, credentials)
        seed_templates(db)
        db.commit()


 
initialize_super_admin = initialize_application
