"""order details for approval of employee orders

Revision ID: 20261120_11
Revises: 20261119_10
"""
from alembic import op
import sqlalchemy as sa

revision = '20261120_11'
down_revision = '20261119_10'
branch_labels = None
depends_on = None


def upgrade():
    columns = {item['name'] for item in sa.inspect(op.get_bind()).get_columns('card_orders')}
    if 'details' not in columns:
        op.add_column('card_orders', sa.Column('details', sa.JSON(), nullable=True))


def downgrade():
    columns = {item['name'] for item in sa.inspect(op.get_bind()).get_columns('card_orders')}
    if 'details' in columns:
        op.drop_column('card_orders', 'details')
