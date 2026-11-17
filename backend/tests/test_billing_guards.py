import os
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SECRET_KEY'] = 'test-only-secret-key-with-at-least-32-characters'

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.bootstrap import create_system_admin, seed_templates
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import CardOrder, CardRequest, CardTemplate, Company, Employee, GeneratedCard, PaymentRecord, User
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
    resp = client.post('/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200, resp.text
    return {'Authorization': f"Bearer {resp.json()['access_token']}"}


def test_card_request_order_lifecycle_and_download_guards(context):
    client, sessions, tmp_path = context
    admin = login(client, 'system@example.com')

    # Register company
    reg = client.post('/auth/register', json={
        'username': 'BizOwner',
        'company_name': 'Acme Corp',
        'email': 'bizowner@gmail.com',
        'password': 'Password@123',
    })
    assert reg.status_code == 201, reg.text
    company_id = reg.json()['company']['id']
    owner = login(client, 'bizowner@gmail.com')

    # System admin approves company
    assert client.patch(f'/admin/companies/{company_id}/status', json={'status': 'APPROVED'}, headers=admin).status_code == 200

    # Create 2 employees
    e1 = client.post('/employees', headers=owner, json={
        'employee_id': 'EMP-001', 'name': 'Alice Smith', 'designation': 'CTO',
        'department': 'Eng', 'email': 'alice@example.com', 'phone': '+8801700000001',
    }).json()
    e2 = client.post('/employees', headers=owner, json={
        'employee_id': 'EMP-002', 'name': 'Bob Jones', 'designation': 'VP',
        'department': 'Product', 'email': 'bob@example.com', 'phone': '+8801700000002',
    }).json()

    # Select template
    templates = client.get('/templates', headers=owner).json()
    template_id = templates[0]['id']
    client.post(f'/templates/{template_id}/select', headers=owner)

    # 1. Create card request
    req = client.post('/card-requests', headers=owner, json={
        'template_id': template_id,
        'employee_ids': [e1['id'], e2['id']],
    })
    assert req.status_code == 201, req.text
    req_data = req.json()
    request_id = req_data['id']

    # Verify order is linked to request with PENDING_PAYMENT
    assert req_data.get('order') is not None
    order_id = req_data['order']['id']
    assert req_data['order']['status'] == 'PENDING_PAYMENT'
    assert req_data['order']['quantity'] == 2
    assert req_data['order']['total_amount'] == 100

    # Verify company orders list returns the order with request_id
    company_orders = client.get('/company/card-orders', headers=owner).json()
    assert any(o['id'] == order_id and o['request_id'] == request_id for o in company_orders)

    # Verify admin payments list shows the order
    admin_payments = client.get('/admin/payments', headers=admin).json()
    assert any(p['id'] == order_id and p['status'] == 'PENDING_PAYMENT' for p in admin_payments)

    # 2. In Model 1: Admin approves request first
    app_resp = client.patch(f'/admin/card-requests/{request_id}/decision', headers=admin, json={'decision': 'APPROVED'})
    assert app_resp.status_code == 200
    assert app_resp.json()['status'] == 'COMPLETED'

    # Verify order is STILL PENDING_PAYMENT (Approval happened, but company hasn't paid yet!)
    assert app_resp.json()['order']['status'] == 'PENDING_PAYMENT'

    # 3. Test download guard on approved but UNPAID request cards (402 Payment Required)
    download_unpaid = client.get(f'/card-requests/{request_id}/cards/download', headers=owner)
    assert download_unpaid.status_code == 402, download_unpaid.text
    assert 'Payment required' in download_unpaid.json()['detail']

    # 4. Pay the order via sandbox payment gateway endpoint
    pay_resp = client.post(f'/orders/{order_id}/pay', headers=owner, json={'method': 'BKASH_SANDBOX'})
    assert pay_resp.status_code == 200, pay_resp.text
    pay_data = pay_resp.json()
    assert pay_data['status'] == 'PAID'
    assert pay_data['method'] == 'BKASH_SANDBOX'

    # Idempotent pay call returns 200
    pay_again = client.post(f'/orders/{order_id}/pay', headers=owner, json={'method': 'BKASH_SANDBOX'})
    assert pay_again.status_code == 200
    assert 'already paid' in pay_again.json()['message']

    # 5. Verify downloads are now unlocked and return PDF zip
    download_paid = client.get(f'/card-requests/{request_id}/cards/download', headers=owner)
    assert download_paid.status_code == 200
    assert download_paid.headers['content-type'] == 'application/zip'

    # Verify individual card download is also unlocked
    cards = client.get(f'/card-requests/{request_id}/cards', headers=owner).json()
    assert len(cards) == 2
    card_dl = client.get(f"/cards/{cards[0]['id']}/download", headers=owner)
    assert card_dl.status_code == 200
    assert card_dl.content.startswith(b'%PDF')


def test_employee_personal_card_payment_guard(context):
    client, _, _ = context
    # Register an employee
    assert client.post('/auth/employee/register', json={'username': 'Emp1', 'email': 'emp1@gmail.com', 'password': 'Password@123'}).status_code == 201
    emp_token = login(client, 'emp1@gmail.com')

    # Employee orders personal card
    checkout = client.post('/employee/checkout/personal', headers=emp_token, json={'quantity': 1, 'name': 'Emp One', 'designation': 'Consultant'})
    assert checkout.status_code == 201, checkout.text
    order_id = checkout.json()['order_id']
    card_id = checkout.json()['card_ids'][0]
    assert checkout.json()['payment_status'] == 'PENDING_PAYMENT'

    # Attempt to download before payment -> 402 Payment Required
    unpaid_dl = client.get(f'/employee/personal-cards/{card_id}/download', headers=emp_token)
    assert unpaid_dl.status_code == 402, unpaid_dl.text
    assert 'Payment required' in unpaid_dl.json()['detail']

    # Employee pays via sandbox gateway
    pay_resp = client.post(f'/orders/{order_id}/pay', headers=emp_token, json={'method': 'NAGAD_SANDBOX'})
    assert pay_resp.status_code == 200
    assert pay_resp.json()['status'] == 'PAID'

    # Now download succeeds
    paid_dl = client.get(f'/employee/personal-cards/{card_id}/download', headers=emp_token)
    assert paid_dl.status_code == 200
    assert paid_dl.content.startswith(b'%PDF')


def test_unauthorized_user_cannot_pay_foreign_order(context):
    client, _, _ = context
    admin = login(client, 'system@example.com')

    # Register Company 1
    r1 = client.post('/auth/register', json={'username': 'O1', 'company_name': 'C1', 'email': 'o1@gmail.com', 'password': 'Password@123'}).json()
    client.patch(f"/admin/companies/{r1['company']['id']}/status", json={'status': 'APPROVED'}, headers=admin)
    h1 = login(client, 'o1@gmail.com')
    t1 = client.get('/templates', headers=h1).json()[0]['id']
    client.post(f'/templates/{t1}/select', headers=h1)
    e1 = client.post('/employees', headers=h1, json={'employee_id': 'E1', 'name': 'Emp 1', 'designation': 'D', 'department': 'Dept', 'email': 'e1@example.com', 'phone': '+8801'}).json()
    req1 = client.post('/card-requests', headers=h1, json={'template_id': t1, 'employee_ids': [e1['id']]}).json()
    order1_id = req1['order']['id']

    # Register Company 2
    r2 = client.post('/auth/register', json={'username': 'O2', 'company_name': 'C2', 'email': 'o2@gmail.com', 'password': 'Password@123'}).json()
    client.patch(f"/admin/companies/{r2['company']['id']}/status", json={'status': 'APPROVED'}, headers=admin)
    h2 = login(client, 'o2@gmail.com')

    # Company 2 tries to pay Company 1's order -> 403 Forbidden
    pay_foreign = client.post(f'/orders/{order1_id}/pay', headers=h2, json={'method': 'BKASH_SANDBOX'})
    assert pay_foreign.status_code == 403, pay_foreign.text

    # Paying nonexistent order -> 404 Not Found
    pay_missing = client.post('/orders/99999/pay', headers=h1, json={'method': 'BKASH_SANDBOX'})
    assert pay_missing.status_code == 404


def test_employee_company_card_payment_guard(context):
    client, _, _ = context
    admin = login(client, 'system@example.com')

    # Register and approve company
    co_resp = client.post('/auth/register', json={
        'username': 'CompAdmin', 'company_name': 'Tech Corp', 'email': 'techcorp.admin@gmail.com', 'password': 'Password@123'
    })
    assert co_resp.status_code == 201, co_resp.text
    co = co_resp.json()
    client.patch(f"/admin/companies/{co['company']['id']}/status", json={'status': 'APPROVED'}, headers=admin)
    c_owner = login(client, 'techcorp.admin@gmail.com')

    # Add employee to roster
    client.post('/employees', headers=c_owner, json={
        'employee_id': 'TC-01', 'name': 'Dev Dave', 'designation': 'Senior Dev',
        'department': 'Tech', 'email': 'dave@corp.com', 'phone': '+8801999999999'
    })

    # Register employee user and approve membership
    client.post('/auth/employee/register', json={
        'username': 'Dave', 'email': 'dave.emp@gmail.com', 'password': 'Password@123'
    })
    emp_token = login(client, 'dave.emp@gmail.com')
    join_resp = client.post(f"/memberships/{co['company']['id']}", headers=emp_token, json={
        'official_email': 'dave@corp.com', 'employee_id': 'TC-01'
    }).json()
    client.patch(f"/company/memberships/{join_resp['id']}", headers=c_owner, json={'decision': 'APPROVED'})

    # Get templates
    templates = client.get(f"/employee/templates/{co['company']['id']}", headers=emp_token).json()
    template_id = templates[0]['id']

    # Employee orders company card (e.g. 1 card)
    checkout = client.post(f"/employee/checkout/company/{co['company']['id']}", headers=emp_token, json={
        'quantity': 1, 'template_id': template_id
    })
    assert checkout.status_code == 201, checkout.text
    order_id = checkout.json()['order_id']
    card_id = checkout.json()['card_ids'][0]
    assert checkout.json()['payment_status'] == 'PENDING_PAYMENT'
    assert checkout.json()['total_amount'] == 50

    # Cards list reports payment_status PENDING_PAYMENT
    cards_list = client.get('/employee/cards', headers=emp_token).json()
    assert cards_list[0]['id'] == card_id
    assert cards_list[0]['payment_status'] == 'PENDING_PAYMENT'

    # Download before paying -> 402 Payment Required!
    blocked = client.get(f'/employee/cards/{card_id}/download', headers=emp_token)
    assert blocked.status_code == 402, blocked.text
    assert 'Payment required' in blocked.json()['detail']

    # Pay via bKash sandbox
    pay_resp = client.post(f'/orders/{order_id}/pay', headers=emp_token, json={'method': 'BKASH_SANDBOX'})
    assert pay_resp.status_code == 200
    assert pay_resp.json()['status'] == 'PAID'

    # Cards list now reports PAID
    cards_list_after = client.get('/employee/cards', headers=emp_token).json()
    assert cards_list_after[0]['payment_status'] == 'PAID'

    # Download now succeeds and returns PDF!
    allowed = client.get(f'/employee/cards/{card_id}/download', headers=emp_token)
    assert allowed.status_code == 200
    assert allowed.content.startswith(b'%PDF')
