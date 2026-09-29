"""company card MVP schema

Revision ID: 20260920_01
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, select
from app.db.base import Base
import app.models  # noqa: F401

revision = '20260920_01'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if 'users' not in inspector.get_table_names():
        Base.metadata.create_all(bind)
    else:
        Base.metadata.tables['card_templates'].create(bind, checkfirst=True)
        Base.metadata.tables['companies'].create(bind, checkfirst=True)
        columns = {column['name'] for column in inspect(bind).get_columns('users')}
        if 'company_id' not in columns:
            with op.batch_alter_table('users') as batch:
                batch.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
                batch.create_foreign_key('fk_users_company_id', 'companies', ['company_id'], ['id'])
                batch.create_index('ix_users_company_id', ['company_id'])

        constraints = {item['name'] for item in inspect(bind).get_check_constraints('users')}
        with op.batch_alter_table('users') as batch:
            if 'check_user_role' in constraints:
                batch.drop_constraint('check_user_role', type_='check')
            if 'check_user_company' in constraints:
                batch.drop_constraint('check_user_company', type_='check')

        users = sa.table('users', sa.column('id'), sa.column('username'), sa.column('role'), sa.column('company_id'))
        companies = sa.table('companies', sa.column('id'), sa.column('name'), sa.column('status'))
        bind.execute(users.update().where(users.c.role == 'super_admin').values(role='SYSTEM_ADMIN', company_id=None))
        bind.execute(users.update().where(users.c.role.in_(['user', 'admin'])).values(role='COMPANY_ADMIN'))
        orphan_admins = bind.execute(select(users.c.id, users.c.username).where(
            users.c.role == 'COMPANY_ADMIN', users.c.company_id.is_(None)
        )).all()
        for user_id, username in orphan_admins:
            company_id = bind.execute(
                companies.insert()
                .values(name=f'{username} Company', status='PENDING')
                .returning(companies.c.id)
            ).scalar_one()
            bind.execute(users.update().where(users.c.id == user_id).values(company_id=company_id))

        with op.batch_alter_table('users') as batch:
            batch.alter_column('role', existing_type=sa.String(20), type_=sa.String(20), nullable=False)
            batch.create_check_constraint('check_user_role', "role IN ('SYSTEM_ADMIN', 'COMPANY_ADMIN')")
            batch.create_check_constraint(
                'check_user_company',
                "(role = 'SYSTEM_ADMIN' AND company_id IS NULL) OR "
                "(role = 'COMPANY_ADMIN' AND company_id IS NOT NULL)",
            )
        for table in Base.metadata.sorted_tables:
            if table.name not in {'users', 'card_templates', 'companies'}:
                table.create(bind, checkfirst=True)

    templates = Base.metadata.tables['card_templates']
    for name, description, style_key in (
        ('Classic', 'Traditional, formal business card', 'classic'),
        ('Modern', 'Bold color and contemporary layout', 'modern'),
        ('Minimal', 'Clean typography with generous spacing', 'minimal'),
    ):
        if not bind.execute(select(templates.c.id).where(templates.c.style_key == style_key)).first():
            bind.execute(templates.insert().values(
                name=name, description=description, style_key=style_key, is_active=True
            ))


def downgrade():
    bind = op.get_bind()
    for name in ('generated_cards', 'card_request_items', 'card_requests', 'employees'):
        Base.metadata.tables[name].drop(bind, checkfirst=True)
    with op.batch_alter_table('users') as batch:
        batch.drop_constraint('check_user_company', type_='check')
        batch.drop_constraint('check_user_role', type_='check')
    bind.execute(sa.text("UPDATE users SET role='super_admin' WHERE role='SYSTEM_ADMIN'"))
    bind.execute(sa.text("UPDATE users SET role='user' WHERE role='COMPANY_ADMIN'"))
    with op.batch_alter_table('users') as batch:
        batch.drop_index('ix_users_company_id')
        batch.drop_constraint('fk_users_company_id', type_='foreignkey')
        batch.drop_column('company_id')
        batch.create_check_constraint('check_user_role', "role IN ('user', 'admin', 'super_admin')")
    Base.metadata.tables['companies'].drop(bind, checkfirst=True)
    Base.metadata.tables['card_templates'].drop(bind, checkfirst=True)
