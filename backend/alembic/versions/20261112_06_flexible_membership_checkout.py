"""flexible employee verification and mock checkout

Revision ID: 20261112_06
Revises: 20261111_05
"""
from alembic import op
import sqlalchemy as sa

revision = '20261112_06'
down_revision = '20261111_05'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {item['name'] for item in sa.inspect(bind).get_columns('memberships')}
    with op.batch_alter_table('memberships') as batch:
        if 'official_email' not in columns:
            batch.add_column(sa.Column('official_email', sa.String(255), nullable=True))
        if 'employee_code' not in columns:
            batch.add_column(sa.Column('employee_code', sa.String(50), nullable=True))
        if 'payer' not in columns:
            batch.add_column(sa.Column('payer', sa.String(20), nullable=False, server_default='COMPANY'))
        batch.alter_column('user_id', existing_type=sa.Uuid(), nullable=True)
    bind.execute(sa.text("UPDATE memberships SET official_email = COALESCE(official_email, ''), employee_code = COALESCE(employee_code, '')"))
    constraints = {item['name'] for item in sa.inspect(bind).get_check_constraints('memberships')}
    uniques = {item['name'] for item in sa.inspect(bind).get_unique_constraints('memberships')}
    with op.batch_alter_table('memberships') as batch:
        if 'check_membership_status' in constraints:
            batch.drop_constraint('check_membership_status', type_='check')
        batch.create_check_constraint('check_membership_status', "status IN ('PENDING','PRE_APPROVED','APPROVED','REJECTED','REVOKED')")
        if 'check_membership_payer' not in constraints:
            batch.create_check_constraint('check_membership_payer', "payer IN ('COMPANY','INDIVIDUAL')")
        if 'uq_membership_company_employee' not in uniques:
            batch.create_unique_constraint('uq_membership_company_employee', ['company_id', 'employee_id'])
        batch.alter_column('official_email', existing_type=sa.String(255), nullable=False)
        batch.alter_column('employee_code', existing_type=sa.String(50), nullable=False)
    tables = set(sa.inspect(bind).get_table_names())
    if 'card_orders' not in tables:
        op.create_table('card_orders',
            sa.Column('id', sa.Integer(), primary_key=True), sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=True),
            sa.Column('user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('membership_id', sa.Integer(), sa.ForeignKey('memberships.id', ondelete='SET NULL'), nullable=True),
            sa.Column('quantity', sa.Integer(), nullable=False), sa.Column('unit_price', sa.Integer(), nullable=False),
            sa.Column('total_amount', sa.Integer(), nullable=False), sa.Column('payer', sa.String(20), nullable=False),
            sa.Column('status', sa.String(20), nullable=False, server_default='PAID'), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.CheckConstraint('quantity > 0', name='check_order_quantity'), sa.CheckConstraint("payer IN ('COMPANY','INDIVIDUAL')", name='check_order_payer'))
        op.create_index('ix_card_orders_company_id', 'card_orders', ['company_id']); op.create_index('ix_card_orders_user_id', 'card_orders', ['user_id'])
        op.create_table('payment_records', sa.Column('id', sa.Integer(), primary_key=True), sa.Column('order_id', sa.Integer(), sa.ForeignKey('card_orders.id', ondelete='CASCADE'), nullable=False, unique=True), sa.Column('amount', sa.Integer(), nullable=False), sa.Column('method', sa.String(30), nullable=False, server_default='MOCK_CHECKOUT'), sa.Column('status', sa.String(20), nullable=False, server_default='PAID'), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
        op.create_table('personal_cards', sa.Column('id', sa.Integer(), primary_key=True), sa.Column('user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False), sa.Column('order_id', sa.Integer(), sa.ForeignKey('card_orders.id', ondelete='CASCADE'), nullable=False), sa.Column('file_path', sa.String(500), nullable=False), sa.Column('file_name', sa.String(255), nullable=False), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
        op.create_index('ix_personal_cards_user_id', 'personal_cards', ['user_id'])


def downgrade():
    op.drop_table('personal_cards'); op.drop_table('payment_records'); op.drop_table('card_orders')
