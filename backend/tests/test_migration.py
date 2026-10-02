from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, select, text
from app.core.config import settings
from app.models import CardTemplate


def test_alembic_upgrade_on_empty_database(tmp_path, monkeypatch):
    database = tmp_path / 'migration.db'
    monkeypatch.setattr(settings, 'database_url', f'sqlite:///{database.as_posix()}')
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    command.upgrade(config, 'head')
    engine = create_engine(settings.database_url)
    tables = set(inspect(engine).get_table_names())
    assert {
        'users', 'companies', 'employees', 'card_templates', 'card_requests',
        'card_request_items', 'generated_cards', 'notifications', 'audit_logs', 'alembic_version',
    } <= tables
    assert {'verification_token', 'status'} <= {column['name'] for column in inspect(engine).get_columns('generated_cards')}
    with engine.connect() as connection:
        assert len(connection.execute(select(CardTemplate)).all()) == 3
    engine.dispose()


def test_alembic_upgrades_previous_user_schema(tmp_path, monkeypatch):
    database = tmp_path / 'old-schema.db'
    url = f'sqlite:///{database.as_posix()}'
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                CONSTRAINT check_user_role CHECK (role IN ('user','admin','super_admin'))
            )
        """))
        connection.execute(text("""
            INSERT INTO users (id, username, email, password_hash, role)
            VALUES ('00000000-0000-0000-0000-000000000001', 'Root', 'root@example.com', 'hash', 'super_admin'),
                   ('00000000-0000-0000-0000-000000000002', 'Owner', 'owner@example.com', 'hash', 'user')
        """))
    engine.dispose()
    monkeypatch.setattr(settings, 'database_url', url)
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    command.upgrade(config, 'head')
    engine = create_engine(url)
    with engine.connect() as connection:
        rows = connection.execute(text('SELECT role, company_id FROM users ORDER BY email')).all()
        assert rows == [('COMPANY_ADMIN', 1), ('SYSTEM_ADMIN', None)]
    engine.dispose()
