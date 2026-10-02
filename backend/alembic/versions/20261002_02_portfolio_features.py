"""portfolio profile, QR verification, notifications and audit

Revision ID: 20261002_02
Revises: 20260920_01
"""
from uuid import uuid4
from alembic import op
import sqlalchemy as sa

revision = '20261002_02'
down_revision = '20260920_01'
branch_labels = None
depends_on = None


def _columns(bind, table):
    return {column['name'] for column in sa.inspect(bind).get_columns(table)}


def upgrade():
    bind = op.get_bind()
    company_columns = _columns(bind, 'companies')
    with op.batch_alter_table('companies') as batch:
        if 'phone' not in company_columns: batch.add_column(sa.Column('phone', sa.String(50), nullable=True))
        if 'address' not in company_columns: batch.add_column(sa.Column('address', sa.String(300), nullable=True))
        if 'website' not in company_columns: batch.add_column(sa.Column('website', sa.String(255), nullable=True))
        if 'description' not in company_columns: batch.add_column(sa.Column('description', sa.Text(), nullable=True))
        if 'logo_path' not in company_columns: batch.add_column(sa.Column('logo_path', sa.String(500), nullable=True))
        if 'rejection_reason' not in company_columns: batch.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))
        if 'updated_at' not in company_columns: batch.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    employee_columns = _columns(bind, 'employees')
    with op.batch_alter_table('employees') as batch:
        if 'photo_path' not in employee_columns: batch.add_column(sa.Column('photo_path', sa.String(500), nullable=True))
        if 'is_active' not in employee_columns: batch.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False))
        if 'created_at' not in employee_columns: batch.add_column(sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
        if 'updated_at' not in employee_columns: batch.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    request_columns = _columns(bind, 'card_requests')
    with op.batch_alter_table('card_requests') as batch:
        if 'decided_by_id' not in request_columns:
            batch.add_column(sa.Column('decided_by_id', sa.Uuid(), nullable=True))
            batch.create_foreign_key('fk_card_requests_decided_by', 'users', ['decided_by_id'], ['id'])
        if 'decided_at' not in request_columns: batch.add_column(sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True))

    card_columns = _columns(bind, 'generated_cards')
    added_token = 'verification_token' not in card_columns
    with op.batch_alter_table('generated_cards') as batch:
        if added_token: batch.add_column(sa.Column('verification_token', sa.String(64), nullable=True))
        if 'status' not in card_columns: batch.add_column(sa.Column('status', sa.String(20), server_default='ACTIVE', nullable=False))
    if added_token:
        cards = sa.table('generated_cards', sa.column('id'), sa.column('verification_token'))
        for card_id in bind.execute(sa.select(cards.c.id)).scalars():
            bind.execute(cards.update().where(cards.c.id == card_id).values(verification_token=uuid4().hex))
        with op.batch_alter_table('generated_cards') as batch:
            batch.alter_column('verification_token', existing_type=sa.String(64), nullable=False)
            batch.create_unique_constraint('uq_generated_cards_verification_token', ['verification_token'])
            batch.create_index('ix_generated_cards_verification_token', ['verification_token'])
    if 'status' not in card_columns:
        with op.batch_alter_table('generated_cards') as batch:
            batch.create_index('ix_generated_cards_status', ['status'])
            batch.create_check_constraint('check_generated_card_status', "status IN ('ACTIVE','DEACTIVATED')")

    tables = set(sa.inspect(bind).get_table_names())
    if 'notifications' not in tables:
        op.create_table('notifications',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('kind', sa.String(50), nullable=False),
            sa.Column('message', sa.String(300), nullable=False),
            sa.Column('is_read', sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
        op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
        op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    if 'audit_logs' not in tables:
        op.create_table('audit_logs',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('actor_id', sa.Uuid(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='SET NULL'), nullable=True),
            sa.Column('action', sa.String(80), nullable=False),
            sa.Column('entity_type', sa.String(50), nullable=False),
            sa.Column('entity_id', sa.String(64), nullable=False),
            sa.Column('details', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
        op.create_index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'])
        op.create_index('ix_audit_logs_company_id', 'audit_logs', ['company_id'])
        op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
        op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])


def downgrade():
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if 'audit_logs' in tables: op.drop_table('audit_logs')
    if 'notifications' in tables: op.drop_table('notifications')
    with op.batch_alter_table('generated_cards') as batch:
        batch.drop_constraint('check_generated_card_status', type_='check')
        batch.drop_index('ix_generated_cards_status')
        batch.drop_index('ix_generated_cards_verification_token')
        batch.drop_constraint('uq_generated_cards_verification_token', type_='unique')
        batch.drop_column('status'); batch.drop_column('verification_token')
    with op.batch_alter_table('card_requests') as batch:
        batch.drop_constraint('fk_card_requests_decided_by', type_='foreignkey')
        batch.drop_column('decided_at'); batch.drop_column('decided_by_id')
    with op.batch_alter_table('employees') as batch:
        for name in ('updated_at', 'created_at', 'is_active', 'photo_path'): batch.drop_column(name)
    with op.batch_alter_table('companies') as batch:
        for name in ('updated_at', 'rejection_reason', 'logo_path', 'description', 'website', 'address', 'phone'): batch.drop_column(name)
