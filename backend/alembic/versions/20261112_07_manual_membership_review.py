"""manual membership review with match_status

Revision ID: 20261112_07
Revises: 20261112_06
"""
from alembic import op
import sqlalchemy as sa

revision = '20261112_07'
down_revision = '20261112_06'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {item['name'] for item in sa.inspect(bind).get_columns('memberships')}
    if 'match_status' not in columns:
        with op.batch_alter_table('memberships') as batch:
            batch.add_column(sa.Column('match_status', sa.String(20), nullable=True))


def downgrade():
    with op.batch_alter_table('memberships') as batch:
        batch.drop_column('match_status')
