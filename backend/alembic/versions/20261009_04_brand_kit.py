"""Company brand kit.
Revision ID: 20261009_04
Revises: 20261009_03
"""
from alembic import op
import sqlalchemy as sa
revision = '20261009_04'
down_revision = '20261009_03'
branch_labels = None
depends_on = None


def upgrade():
    columns = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('companies')}
    if 'brand_kit' not in columns:
        op.add_column('companies', sa.Column('brand_kit', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('companies', 'brand_kit')
