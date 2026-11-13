from pydantic import ValidationError
from sqlalchemy import select, text, update
from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal
from app.models import CardTemplate, Company, User
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


def _design(name, description, background, text, accent, decoration, layout='left'):
    return {'name': name, 'description': description, 'background': background, 'text': text, 'accent': accent,
            'layout': layout, 'decoration': decoration, 'font': 'Helvetica', 'two_sided': False}


SHAPE_TEMPLATES = (
    ('Bangladesh ID Card', 'Green and red identity card, front only', 'bd_govt_id',
     _design('Bangladesh ID Card', 'Green and red identity card, front only', '#FFFFFF', '#12261F', '#006A4E', 'govt')),
    ('Star Badge', 'Five-point star accent', 'shape_star',
     _design('Star Badge', 'Five-point star accent', '#FFFFFF', '#12261F', '#006A4E', 'star')),
    ('Sun Rays', 'Radiating sun accent', 'shape_sun',
     _design('Sun Rays', 'Radiating sun accent', '#FFFFFF', '#12261F', '#F42A41', 'sun')),
)


# The built-in demo designs above are retired: companies now create their own
# templates with the AI designer or by uploading a finished design (ML). They are
# kept in the database (old card requests point to them) but hidden everywhere.
DEMO_STYLE_KEYS = tuple(t[2] for t in DEFAULT_TEMPLATES) + tuple(t[2] for t in SHAPE_TEMPLATES)


def _is_gemini_design(template) -> bool:
    """Templates made with the old Gemini 'describe a design' tool (and shared copies of them)."""
    key = template.style_key or ''
    design = template.design or {}
    return (key.startswith('ai_') or key.startswith('shared_')) and design.get('kind') != 'image'


def retire_gemini_templates(db):
    """Only uploaded (machine-learning) designs are used now; hide Gemini-made ones."""
    retired = [t for t in db.scalars(select(CardTemplate).where(CardTemplate.is_active.is_(True))) if _is_gemini_design(t)]
    ids = [t.id for t in retired]
    if not ids:
        return
    db.execute(update(Company).where(Company.selected_template_id.in_(ids)).values(selected_template_id=None))
    for template in retired:
        template.is_active = False


def retire_demo_templates(db):
    demo_ids = select(CardTemplate.id).where(CardTemplate.style_key.in_(DEMO_STYLE_KEYS), CardTemplate.company_id.is_(None))
    db.execute(update(Company).where(Company.selected_template_id.in_(demo_ids)).values(selected_template_id=None))
    db.execute(update(CardTemplate).where(CardTemplate.style_key.in_(DEMO_STYLE_KEYS), CardTemplate.company_id.is_(None))
               .values(is_active=False))


def seed_templates(db):
    """Test helper only: creates the old demo designs so tests have ready-made templates."""
    existing = set(db.scalars(select(CardTemplate.style_key)).all())
    for name, description, style_key in DEFAULT_TEMPLATES:
        if style_key not in existing:
            db.add(CardTemplate(name=name, description=description, style_key=style_key, is_active=True))
    for name, description, style_key, design in SHAPE_TEMPLATES:
        if style_key not in existing:
            db.add(CardTemplate(name=name, description=description, style_key=style_key, design=design, is_active=True))


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
        retire_demo_templates(db)
        retire_gemini_templates(db)
        db.commit()


 
initialize_super_admin = initialize_application
