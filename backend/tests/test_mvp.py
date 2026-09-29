import os
from pathlib import Path

os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SECRET_KEY'] = 'test-only-secret-key-with-at-least-32-characters'

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from pypdf import PdfReader
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.bootstrap import create_system_admin, seed_templates
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import CardRequest, CardTemplate, Company, Employee, GeneratedCard, User
from app.schemas.auth import SystemAdminCredentials


@pytest.fixture
def context(tmp_path, monkeypatch):
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        create_system_admin(db, SystemAdminCredentials(
            username='System', email='system@example.com', password='Password@123'
        ))
        seed_templates(db)
        db.commit()

    def override_db():
        with sessions() as db:
            yield db

    monkeypatch.setattr('app.main.initialize_application', lambda: None)
    monkeypatch.setattr(settings, 'generated_card_storage', str(tmp_path / 'cards'))
    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client, sessions, tmp_path
    app.dependency_overrides.clear()
    engine.dispose()


def login(client, email, password='Password@123'):
    response = client.post('/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200, response.text
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


def register_company(client, number=1):
    response = client.post('/auth/register', json={
        'username': f'Owner {number}',
        'company_name': f'Company {number}',
        'email': f'owner{number}@gmail.com',
        'password': 'Password@123',
    })
    assert response.status_code == 201, response.text
    return response.json(), login(client, f'owner{number}@gmail.com')


def approve_company(client, company_id, admin_headers):
    response = client.patch(
        f'/admin/companies/{company_id}/status', json={'status': 'APPROVED'}, headers=admin_headers
    )
    assert response.status_code == 200, response.text


def upload(client, headers, rows):
    csv_text = 'employee_id,name,designation,department,email,phone\n' + '\n'.join(rows)
    return client.post('/employees/import', headers=headers, files={'file': ('employees.csv', csv_text, 'text/csv')})


def prepare_approved_company(client, number=1):
    admin = login(client, 'system@example.com')
    registration, headers = register_company(client, number)
    approve_company(client, registration['company']['id'], admin)
    templates = client.get('/templates', headers=headers).json()
    template_id = templates[0]['id']
    assert client.post(f'/templates/{template_id}/select', headers=headers).status_code == 200
    return registration, headers, admin, template_id


def test_registration_login_and_company_approval_authorization(context):
    client, _, _ = context
    registration, company_headers = register_company(client)
    assert registration['user']['role'] == 'COMPANY_ADMIN'
    assert registration['company']['status'] == 'PENDING'
    assert client.get('/employees', headers=company_headers).status_code == 403
    assert client.patch(
        f"/admin/companies/{registration['company']['id']}/status",
        json={'status': 'APPROVED'}, headers=company_headers,
    ).status_code == 403
    admin = login(client, 'system@example.com')
    directory = client.get('/admin/companies', headers=admin).json()
    assert directory[0]['admins'][0]['email'] == 'owner1@gmail.com'
    assert 'password_hash' not in directory[0]['admins'][0]
    approve_company(client, registration['company']['id'], admin)
    assert client.get('/employees', headers=company_headers).status_code == 200
    assert client.post('/auth/register', json={
        'username': 'Bad', 'company_name': 'Bad Co', 'email': 'bad@gmail.com',
        'password': 'Password@123', 'role': 'SYSTEM_ADMIN',
    }).status_code == 422


def test_system_admin_bootstrap_is_idempotent(context):
    _, sessions, _ = context
    credentials = SystemAdminCredentials(username='Other', email='other@example.com', password='different123')
    with sessions() as db:
        first = db.scalar(select(User).where(User.role == 'SYSTEM_ADMIN'))
        result = create_system_admin(db, credentials)
        db.commit()
        assert result.id == first.id
        assert db.scalar(select(func.count()).select_from(User).where(User.role == 'SYSTEM_ADMIN')) == 1


def test_csv_success_failure_duplicate_and_rollback(context):
    client, sessions, _ = context
    _, headers, _, _ = prepare_approved_company(client)
    duplicate_file = [
        'E001,A One,Engineer,Tech,a@example.com,111',
        'E001,B Two,Manager,Ops,b@example.com,222',
    ]
    assert upload(client, headers, duplicate_file).status_code == 422
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Employee)) == 0

    valid = [
        'E001,A One,Engineer,Tech,a@example.com,111',
        'E002,B Two,Manager,Ops,b@example.com,222',
    ]
    assert upload(client, headers, valid).json() == {'imported': 2}
    bad_after_existing = [
        'E003,C Three,Designer,Brand,c@example.com,333',
        'E001,A Again,Engineer,Tech,a2@example.com,444',
    ]
    assert upload(client, headers, bad_after_existing).status_code == 422
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Employee)) == 2


def test_company_isolation_and_template_selection(context):
    client, sessions, _ = context
    first, first_headers, _, first_template = prepare_approved_company(client, 1)
    second, second_headers, _, _ = prepare_approved_company(client, 2)
    assert upload(client, first_headers, ['A1,Alice,Engineer,Tech,a@one.com,111']).status_code == 201
    assert upload(client, second_headers, ['B1,Bob,Manager,Ops,b@two.com,222']).status_code == 201
    with sessions() as db:
        other_employee = db.scalar(select(Employee).where(Employee.company_id == second['company']['id']))
    assert client.get(f'/employees/{other_employee.id}', headers=first_headers).status_code == 404
    response = client.post('/card-requests', headers=first_headers, json={
        'employee_ids': [other_employee.id], 'template_id': first_template,
    })
    assert response.status_code == 404
    with sessions() as db:
        assert db.get(Company, first['company']['id']).selected_template_id == first_template


def test_manual_employee_create_edit_duplicate_and_isolation(context):
    client, _, _ = context
    _, first_headers, _, _ = prepare_approved_company(client, 1)
    _, second_headers, _, _ = prepare_approved_company(client, 2)
    payload = {
        'employee_id': 'M-001', 'name': 'Manual Employee', 'designation': 'Engineer',
        'department': 'Technology', 'email': 'Manual@Example.COM', 'phone': '+8801700000000',
    }
    created = client.post('/employees', headers=first_headers, json=payload)
    assert created.status_code == 201, created.text
    assert created.json()['email'] == 'manual@example.com'
    employee_id = created.json()['id']
    assert client.post('/employees', headers=first_headers, json=payload).status_code == 409
    payload.update({'name': 'Updated Employee', 'designation': 'Senior Engineer'})
    updated = client.put(f'/employees/{employee_id}', headers=first_headers, json=payload)
    assert updated.status_code == 200, updated.text
    assert updated.json()['name'] == 'Updated Employee'
    assert client.put(f'/employees/{employee_id}', headers=second_headers, json=payload).status_code == 404


def test_single_bulk_decisions_pdf_generation_and_idempotency(context):
    client, sessions, _ = context
    _, headers, admin, template_id = prepare_approved_company(client)
    assert upload(client, headers, [
        'E001,Alice,Engineer,Tech,alice@example.com,111',
        'E002,Bob,Manager,Ops,bob@example.com,222',
        'E003,Carol,Designer,Brand,carol@example.com,333',
    ]).status_code == 201
    employees = client.get('/employees', headers=headers).json()

    single = client.post('/card-requests', headers=headers, json={
        'employee_ids': [employees[0]['id']], 'template_id': template_id,
    })
    assert single.status_code == 201
    rejected = client.patch(
        f"/admin/card-requests/{single.json()['id']}/decision",
        headers=admin, json={'decision': 'REJECTED', 'reason': 'Incorrect details'},
    )
    assert rejected.json()['status'] == 'REJECTED'

    bulk = client.post('/card-requests', headers=headers, json={
        'employee_ids': [employees[1]['id'], employees[2]['id']], 'template_id': template_id,
    })
    assert bulk.status_code == 201
    assert bulk.json()['created_by']['email'] == 'owner1@gmail.com'
    assert bulk.json()['company']['name'] == 'Company 1'
    assert bulk.json()['items'][0]['employee']['name'] == 'Bob'
    assert bulk.json()['template']['name'] == 'Classic'
    request_id = bulk.json()['id']
    approved = client.patch(
        f'/admin/card-requests/{request_id}/decision', headers=admin, json={'decision': 'APPROVED'}
    )
    assert approved.status_code == 200
    assert approved.json()['status'] == 'COMPLETED'
    cards = client.get(f'/card-requests/{request_id}/cards', headers=headers).json()
    assert len(cards) == 2
    for card in cards:
        download = client.get(f"/cards/{card['id']}/download", headers=headers)
        assert download.status_code == 200
        assert download.content.startswith(b'%PDF-')
    with sessions() as db:
        paths_before = [Path(value) for value in db.scalars(select(GeneratedCard.file_path)).all()]
        assert all(len(PdfReader(str(path)).pages) == 1 for path in paths_before)

    repeated = client.patch(
        f'/admin/card-requests/{request_id}/decision', headers=admin, json={'decision': 'APPROVED'}
    )
    assert repeated.status_code == 200
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(GeneratedCard)) == 2
        assert [Path(value) for value in db.scalars(select(GeneratedCard.file_path)).all()] == paths_before


def test_cross_company_card_download_is_hidden(context):
    client, _, _ = context
    _, first_headers, admin, template_id = prepare_approved_company(client, 1)
    _, second_headers, _, _ = prepare_approved_company(client, 2)
    upload(client, first_headers, ['E1,Alice,Engineer,Tech,a@example.com,111'])
    employee_id = client.get('/employees', headers=first_headers).json()[0]['id']
    request = client.post('/card-requests', headers=first_headers, json={
        'employee_ids': [employee_id], 'template_id': template_id,
    }).json()
    client.patch(
        f"/admin/card-requests/{request['id']}/decision", headers=admin, json={'decision': 'APPROVED'}
    )
    card_id = client.get(f"/card-requests/{request['id']}/cards", headers=first_headers).json()[0]['id']
    assert client.get(f'/cards/{card_id}/download', headers=second_headers).status_code == 404
    assert client.get(f"/card-requests/{request['id']}", headers=second_headers).status_code == 404
