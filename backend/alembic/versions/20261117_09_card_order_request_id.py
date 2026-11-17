"""link card orders to batch card requests

Revision ID: 20261117_09
Revises: 20261114_08
"""
from alembic import op
import sqlalchemy as sa

revision = '20261117_09'
down_revision = '20261114_08'
branch_labels = None
depends_on = None


def upgrade():
    columns = {item['name'] for item in sa.inspect(op.get_bind()).get_columns('card_orders')}
    if 'request_id' not in columns:
        op.add_column('card_orders', sa.Column('request_id', sa.Integer(), sa.ForeignKey('card_requests.id', ondelete='SET NULL'), nullable=True))
        op.create_index('ix_card_orders_request_id', 'card_orders', ['request_id'])


def downgrade():
    columns = {item['name'] for item in sa.inspect(op.get_bind()).get_columns('card_orders')}
    if 'request_id' in columns:
        op.drop_index('ix_card_orders_request_id', table_name='card_orders')
        op.drop_column('card_orders', 'request_id')
