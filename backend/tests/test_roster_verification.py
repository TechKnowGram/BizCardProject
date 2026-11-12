import pytest
from app.models import Employee, Membership
from sqlalchemy import select
from test_mvp import approve_company, context, login, register_company, upload


def test_roster_csv_import_formats_and_inactive_status(context):
    client, sessions, _ = context
    company, owner = register_company(client)
    admin = login(client, 'system@example.com')
    approve_company(client, company['company']['id'], admin)

    # 1. New CSV format with full_name, official_email, status
    csv_content = (
        'employee_id,full_name,official_email,department,designation,status\n'
        'BSH-01,Rahim Ahmed,rahim@company.com,IT,Software Engineer,ACTIVE\n'
        'BSH-02,Karim Hasan,karim@company.com,HR,HR Manager,INACTIVE\n'
    )
    res = client.post(
        '/employees/import',
        headers=owner,
        files={'file': ('roster.csv', csv_content, 'text/csv')},
    )
    assert res.status_code == 201, res.text
    assert res.json()['imported'] == 2

    with sessions() as db:
        e1 = db.scalar(select(Employee).where(Employee.employee_id == 'BSH-01'))
        e2 = db.scalar(select(Employee).where(Employee.employee_id == 'BSH-02'))
        assert e1.is_active is True
        assert e1.name == 'Rahim Ahmed'
        assert e1.email == 'rahim@company.com'
        assert e2.is_active is False

    # 2. Invalid email format error reporting
    bad_email_csv = (
        'employee_id,full_name,official_email,department,designation,status\n'
        'BSH-03,Bad Email,not-an-email,IT,Eng,ACTIVE\n'
    )
    res = client.post(
        '/employees/import',
        headers=owner,
        files={'file': ('roster.csv', bad_email_csv, 'text/csv')},
    )
    assert res.status_code == 422
    assert 'invalid email' in res.json()['detail'].lower()

    # 3. Duplicate employee ID in same file
    duplicate_csv = (
        'employee_id,full_name,official_email,department,designation,status\n'
        'BSH-04,User One,user1@company.com,IT,Eng,ACTIVE\n'
        'BSH-04,User Two,user2@company.com,IT,Eng,ACTIVE\n'
    )
    res = client.post(
        '/employees/import',
        headers=owner,
        files={'file': ('roster.csv', duplicate_csv, 'text/csv')},
    )
    assert res.status_code == 422
    assert 'duplicate employee_id' in res.json()['detail'].lower()


def test_automatic_verification_exact_match_and_case_insensitive(context):
    client, _, _ = context
    company, owner = register_company(client)
    admin = login(client, 'system@example.com')
    approve_company(client, company['company']['id'], admin)

    # Import employee to roster
    csv_content = (
        'employee_id,full_name,official_email,department,designation,status\n'
        'BSH-10245,Rahim Ahmed,rahim@company.com,IT,Software Engineer,ACTIVE\n'
    )
    assert client.post(
        '/employees/import',
        headers=owner,
        files={'file': ('roster.csv', csv_content, 'text/csv')},
    ).status_code == 201

    # Employee registers
    assert client.post('/auth/employee/register', json={
        'username': 'Rahim Ahmed',
        'email': 'rahim.personal@gmail.com',
        'password': 'Password@123',
    }).status_code == 201
    emp_token = login(client, 'rahim.personal@gmail.com')

    # Submit request with mixed case email and spaces in employee_id
    res = client.post(f"/memberships/{company['company']['id']}", headers=emp_token, json={
        'employee_id': ' BSH-10245 ',
        'official_email': 'RAHIM@COMPANY.COM ',
        'payer': 'COMPANY',
    })
    assert res.status_code == 201, res.text
    membership = res.json()
    # Scenario A: Exact match activates automatically
    assert membership['status'] == 'APPROVED'
    assert membership['match_status'] == 'ROSTER_MATCHED'

    # Duplicate membership prevention
    dup = client.post(f"/memberships/{company['company']['id']}", headers=emp_token, json={
        'employee_id': 'BSH-10245',
        'official_email': 'rahim@company.com',
    })
    assert dup.status_code == 409


def test_verification_mismatch_and_inactive_scenarios(context):
    client, _, _ = context
    company, owner = register_company(client)
    admin = login(client, 'system@example.com')
    approve_company(client, company['company']['id'], admin)

    # Import active and inactive employees
    csv_content = (
        'employee_id,full_name,official_email,department,designation,status\n'
        'EMP-01,Active User,active@company.com,IT,Eng,ACTIVE\n'
        'EMP-02,Inactive User,inactive@company.com,HR,Lead,INACTIVE\n'
    )
    assert client.post(
        '/employees/import',
        headers=owner,
        files={'file': ('roster.csv', csv_content, 'text/csv')},
    ).status_code == 201

    # Register 3 employees
    assert client.post('/auth/employee/register', json={'username': 'User A', 'email': 'usera@gmail.com', 'password': 'Password@123'}).status_code == 201
    assert client.post('/auth/employee/register', json={'username': 'User B', 'email': 'userb@gmail.com', 'password': 'Password@123'}).status_code == 201
    assert client.post('/auth/employee/register', json={'username': 'User C', 'email': 'userc@gmail.com', 'password': 'Password@123'}).status_code == 201
    t_a = login(client, 'usera@gmail.com')
    t_b = login(client, 'userb@gmail.com')
    t_c = login(client, 'userc@gmail.com')

    # Scenario C: Employee ID matches but email does not
    res_c = client.post(f"/memberships/{company['company']['id']}", headers=t_a, json={
        'employee_id': 'EMP-01',
        'official_email': 'wrong.email@company.com',
    })
    assert res_c.status_code == 201
    assert res_c.json()['status'] == 'PENDING'
    assert res_c.json()['match_status'] == 'ID_MISMATCH'

    # Scenario D: Inactive employee
    res_d = client.post(f"/memberships/{company['company']['id']}", headers=t_b, json={
        'employee_id': 'EMP-02',
        'official_email': 'inactive@company.com',
    })
    assert res_d.status_code == 201
    assert res_d.json()['status'] == 'PENDING'
    assert res_d.json()['match_status'] == 'INACTIVE_EMPLOYEE'

    # Scenario B: Employee not found in roster
    res_b = client.post(f"/memberships/{company['company']['id']}", headers=t_c, json={
        'employee_id': 'NONEXISTENT-999',
        'official_email': 'newhire@company.com',
    })
    assert res_b.status_code == 201
    assert res_b.json()['status'] == 'PENDING'
    assert res_b.json()['match_status'] == 'NOT_FOUND'


def test_manual_approval_rejection_and_isolation(context):
    client, _, _ = context
    co1, owner1 = register_company(client, 1)
    co2, owner2 = register_company(client, 2)
    admin = login(client, 'system@example.com')
    approve_company(client, co1['company']['id'], admin)
    approve_company(client, co2['company']['id'], admin)

    # Register employees
    assert client.post('/auth/employee/register', json={'username': 'Alice', 'email': 'alice@gmail.com', 'password': 'Password@123'}).status_code == 201
    assert client.post('/auth/employee/register', json={'username': 'Bob', 'email': 'bob@gmail.com', 'password': 'Password@123'}).status_code == 201
    alice_t = login(client, 'alice@gmail.com')
    bob_t = login(client, 'bob@gmail.com')

    # Alice requests to join Company 1 (not in roster)
    req1 = client.post(f"/memberships/{co1['company']['id']}", headers=alice_t, json={
        'employee_id': 'ALICE-01',
        'official_email': 'alice@co1.com',
    }).json()
    assert req1['status'] == 'PENDING'

    # Bob requests to join Company 1 (not in roster)
    req2 = client.post(f"/memberships/{co1['company']['id']}", headers=bob_t, json={
        'employee_id': 'BOB-01',
        'official_email': 'bob@co1.com',
    }).json()
    assert req2['status'] == 'PENDING'

    # Company 2 admin CANNOT see or approve Company 1's requests
    co2_memberships = client.get('/company/memberships', headers=owner2).json()
    assert len(co2_memberships) == 0
    assert client.patch(f"/company/memberships/{req1['id']}", headers=owner2, json={'decision': 'APPROVED'}).status_code == 404

    # Company 1 admin approves Alice's request
    app_res = client.patch(f"/company/memberships/{req1['id']}", headers=owner1, json={'decision': 'APPROVED'})
    assert app_res.status_code == 200
    assert app_res.json()['status'] == 'APPROVED'
    assert app_res.json()['employee_id'] is not None

    # Company 1 admin rejects Bob's request
    rej_res = client.patch(f"/company/memberships/{req2['id']}", headers=owner1, json={'decision': 'REJECTED'})
    assert rej_res.status_code == 200
    assert rej_res.json()['status'] == 'REJECTED'


def test_card_ordering_by_membership_status(context):
    client, _, _ = context
    co, owner = register_company(client)
    admin = login(client, 'system@example.com')
    approve_company(client, co['company']['id'], admin)

    templates = client.get('/templates', headers=owner).json()
    t_id = templates[0]['id']

    # Register Alice (will be approved) and Bob (will stay pending)
    assert client.post('/auth/employee/register', json={'username': 'Alice Order', 'email': 'alice.order@gmail.com', 'password': 'Password@123'}).status_code == 201
    assert client.post('/auth/employee/register', json={'username': 'Bob Pending', 'email': 'bob.pending@gmail.com', 'password': 'Password@123'}).status_code == 201
    alice_t = login(client, 'alice.order@gmail.com')
    bob_t = login(client, 'bob.pending@gmail.com')

    # Bob requests and stays PENDING
    client.post(f"/memberships/{co['company']['id']}", headers=bob_t, json={
        'employee_id': 'BOB-P', 'official_email': 'bob@corp.com',
    })

    # Bob CANNOT checkout company cards
    bob_order = client.post(f"/employee/checkout/company/{co['company']['id']}", headers=bob_t, json={
        'quantity': 1, 'template_id': t_id, 'payer': 'INDIVIDUAL',
    })
    assert bob_order.status_code == 403

    # Alice requests and is APPROVED manually
    alice_req = client.post(f"/memberships/{co['company']['id']}", headers=alice_t, json={
        'employee_id': 'ALICE-A', 'official_email': 'alice@corp.com',
    }).json()
    client.patch(f"/company/memberships/{alice_req['id']}", headers=owner, json={'decision': 'APPROVED'})

    # Alice CAN checkout company cards
    alice_order = client.post(f"/employee/checkout/company/{co['company']['id']}", headers=alice_t, json={
        'quantity': 2, 'template_id': t_id, 'payer': 'INDIVIDUAL',
    })
    assert alice_order.status_code == 201
    assert alice_order.json()['quantity'] == 2
    assert alice_order.json()['total_amount'] == 100
