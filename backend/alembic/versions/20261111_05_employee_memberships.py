"""employee portal memberships

Revision ID: 20261111_05
Revises: 20261009_04
"""
from alembic import op
import sqlalchemy as sa

revision = '20261111_05'
down_revision = '20261009_04'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if 'memberships' not in tables:
        op.create_table('memberships',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
            sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('company_id', 'user_id', name='uq_membership_company_user'),
            sa.CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','REVOKED')", name='check_membership_status'),
        )
        op.create_index('ix_memberships_company_id', 'memberships', ['company_id'])
        op.create_index('ix_memberships_user_id', 'memberships', ['user_id'])
        op.create_index('ix_memberships_status', 'memberships', ['status'])
    constraints = {item['name'] for item in sa.inspect(bind).get_check_constraints('users')}
    with op.batch_alter_table('users') as batch:
        if 'check_user_role' in constraints:
            batch.drop_constraint('check_user_role', type_='check')
        if 'check_user_company' in constraints:
            batch.drop_constraint('check_user_company', type_='check')
        batch.create_check_constraint('check_user_role', "role IN ('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE')")
        batch.create_check_constraint('check_user_company', "(role IN ('SYSTEM_ADMIN', 'EMPLOYEE') AND company_id IS NULL) OR (role = 'COMPANY_ADMIN' AND company_id IS NOT NULL)")


def downgrade():
    op.drop_table('memberships')
