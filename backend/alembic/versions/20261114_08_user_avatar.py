"""profile picture for every account

Revision ID: 20261114_08
Revises: 20261112_07
"""
from alembic import op
import sqlalchemy as sa

revision = '20261114_08'
down_revision = '20261112_07'
branch_labels = None
depends_on = None


def upgrade():
    # A fresh database already has the column (the first migration builds tables from the current models).
    columns = {item['name'] for item in sa.inspect(op.get_bind()).get_columns('users')}
    if 'avatar_path' not in columns:
        op.add_column('users', sa.Column('avatar_path', sa.String(500), nullable=True))


def downgrade():
    columns = {item['name'] for item in sa.inspect(op.get_bind()).get_columns('users')}
    if 'avatar_path' in columns:
        op.drop_column('users', 'avatar_path')
