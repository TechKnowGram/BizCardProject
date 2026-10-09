"""Company-owned AI template definitions.

Revision ID: 20261009_03
Revises: 20261002_02
"""
from alembic import op
import sqlalchemy as sa
revision = '20261009_03'
down_revision = '20261002_02'
branch_labels = None
depends_on = None


def upgrade():
    columns = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('card_templates')}
    with op.batch_alter_table('card_templates') as batch:
        if 'company_id' not in columns:
            batch.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
            batch.create_foreign_key('fk_template_company', 'companies', ['company_id'], ['id'])
            batch.create_index('ix_card_templates_company_id', ['company_id'])
        if 'design' not in columns:
            batch.add_column(sa.Column('design', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('card_templates') as batch:
        batch.drop_column('design')
        batch.drop_index('ix_card_templates_company_id')
        batch.drop_column('company_id')
