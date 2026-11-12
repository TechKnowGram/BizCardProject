from test_mvp import approve_company, context, login, register_company, upload


def test_employee_membership_and_self_service_card(context):
    client, _, _ = context
    company, owner = register_company(client)
    admin = login(client, 'system@example.com')
    approve_company(client, company['company']['id'], admin)
    registration = client.post('/auth/employee/register', json={
        'username': 'Employee One', 'email': 'employee@example.com', 'password': 'Password@123',
    })
    assert registration.status_code == 201, registration.text
    employee = login(client, 'employee@example.com')
    assert client.post('/employees', headers=owner, json={
        'employee_id': 'E-001', 'name': 'Employee One', 'designation': 'Designer',
        'department': 'Design', 'email': 'employee@example.com', 'phone': '+8801',
    }).status_code == 201
    directory = client.get('/companies/directory', headers=employee)
    assert directory.status_code == 200
    join = {'official_email': 'employee@example.com', 'employee_id': 'E-001', 'payer': 'INDIVIDUAL'}
    request = client.post(f"/memberships/{company['company']['id']}", headers=employee, json=join)
    assert request.status_code == 201, request.text
    assert client.post(f"/memberships/{company['company']['id']}", headers=employee, json=join).status_code == 409
    membership = client.get('/company/memberships', headers=owner).json()[0]
    assert client.patch(f"/company/memberships/{membership['id']}", headers=owner,
                        json={'decision': 'APPROVED'}).status_code == 200
    templates = client.get(f"/employee/templates/{company['company']['id']}", headers=employee).json()
    assert templates
    card = client.post(f"/employee/cards/{company['company']['id']}/{templates[0]['id']}", headers=employee)
    assert card.status_code == 201, card.text
    card_id = card.json()['id']
    assert client.get('/employee/cards', headers=employee).status_code == 200
    assert client.get(f'/employee/cards/{card_id}/download', headers=employee).content.startswith(b'%PDF')
    assert client.patch(f"/company/memberships/{membership['id']}", headers=owner,
                        json={'decision': 'REVOKED'}).status_code == 200
    assert client.post(f"/employee/cards/{company['company']['id']}/{templates[0]['id']}", headers=employee).status_code == 403


def test_membership_company_isolation(context):
    client, _, _ = context
    one, owner_one = register_company(client, 1)
    two, owner_two = register_company(client, 2)
    admin = login(client, 'system@example.com')
    approve_company(client, one['company']['id'], admin); approve_company(client, two['company']['id'], admin)
    assert client.post('/auth/employee/register', json={'username': 'E', 'email': 'e@example.com', 'password': 'Password@123'}).status_code == 201
    employee = login(client, 'e@example.com')
    assert client.post('/employees', headers=owner_one, json={
        'employee_id': 'E-002', 'name': 'E', 'designation': 'Staff',
        'department': 'Ops', 'email': 'e@example.com', 'phone': '+8802',
    }).status_code == 201
    membership = client.post(f"/memberships/{one['company']['id']}", headers=employee,
                             json={'official_email': 'e@example.com', 'employee_id': 'E-002'}).json()
    assert client.patch(f"/company/memberships/{membership['id']}", headers=owner_two,
                        json={'decision': 'APPROVED'}).status_code == 404


def test_imported_employee_links_after_registration(context):
    client, _, _ = context
    company, owner = register_company(client)
    admin = login(client, 'system@example.com')
    approve_company(client, company['company']['id'], admin)
    assert upload(client, owner, ['CSV-1,CSV Person,Analyst,Ops,csvperson@example.com,+8803']).status_code == 201
    rows = client.get('/company/memberships', headers=owner).json()
    assert rows[0]['status'] == 'PRE_APPROVED'
    assert client.post('/auth/employee/register', json={'username': 'CSV Person', 'email': 'csvperson@example.com', 'password': 'Password@123'}).status_code == 201
    employee = login(client, 'csvperson@example.com')
    assert client.get('/memberships/me', headers=employee).json()[0]['status'] == 'APPROVED'


def test_imported_existing_employee_is_linked_and_mock_checkout(context):
    client, _, _ = context
    company, owner = register_company(client)
    admin = login(client, 'system@example.com')
    approve_company(client, company['company']['id'], admin)
    assert client.post('/auth/employee/register', json={'username': 'Existing', 'email': 'existing@example.com', 'password': 'Password@123'}).status_code == 201
    employee = login(client, 'existing@example.com')
    assert upload(client, owner, ['CSV-2,Existing,Engineer,Engineering,existing@example.com,+8804']).status_code == 201
    membership = client.get('/memberships/me', headers=employee).json()[0]
    assert membership['status'] == 'APPROVED'
    templates = client.get(f"/employee/templates/{company['company']['id']}", headers=employee).json()
    checkout = client.post(f"/employee/checkout/company/{company['company']['id']}", headers=employee,
        json={'quantity': 3, 'template_id': templates[0]['id'], 'payer': 'INDIVIDUAL'})
    assert checkout.status_code == 201, checkout.text
    assert checkout.json()['total_amount'] == 150
    assert len(checkout.json()['card_ids']) == 3
    personal = client.post('/employee/checkout/personal', headers=employee,
        json={'quantity': 2, 'name': 'Existing', 'designation': 'Engineer'})
    assert personal.status_code == 201, personal.text
    assert personal.json()['total_amount'] == 100
