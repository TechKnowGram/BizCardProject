"""personal card designs uploaded by individual employees

Revision ID: 20261119_10
Revises: 20261117_09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20261119_10'
down_revision = '20261117_09'
branch_labels = None
depends_on = None


def upgrade():
    if 'personal_templates' in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        'personal_templates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('description', sa.String(255), nullable=False, server_default=''),
        sa.Column('design', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_personal_templates_user_id', 'personal_templates', ['user_id'])


def downgrade():
    if 'personal_templates' in sa.inspect(op.get_bind()).get_table_names():
        op.drop_index('ix_personal_templates_user_id', table_name='personal_templates')
        op.drop_table('personal_templates')
