"""Regression tests for the pre-launch security review."""

from io import BytesIO

import pytest
from PIL import Image

from app.core.config import settings
from test_mvp import approve_company, context, login, prepare_approved_company, register_company, upload  # noqa: F401


def _png(width: int, height: int) -> bytes:
    buffer = BytesIO()
    Image.new('L', (width, height), 255).save(buffer, 'PNG', optimize=True)
    return buffer.getvalue()


def test_employee_id_cannot_escape_the_card_folder(context):
    client, sessions, tmp = context
    _, headers, admin, template_id = prepare_approved_company(client)
    for i, unsafe in enumerate(['../../escape', 'HR/001', 'C:/Windows/evil']):
        employee = client.post('/employees', headers=headers, json={
            'employee_id': unsafe, 'name': f'Person {i}', 'designation': 'Staff', 'department': 'Ops',
            'email': f'p{i}@example.com', 'phone': '123',
        })
        assert employee.status_code == 201, employee.text
        request = client.post('/card-requests', headers=headers, json={'employee_ids': [employee.json()['id']], 'template_id': template_id}).json()
        decided = client.patch(f"/admin/card-requests/{request['id']}/decision", headers=admin, json={'decision': 'APPROVED'})
        assert decided.status_code == 200, decided.text
        cards = client.get(f"/card-requests/{request['id']}/cards", headers=headers).json()
        assert len(cards) == 1
    # Every generated PDF stays inside its company/request folder.
    root = (tmp / 'cards').resolve()
    pdfs = list(root.rglob('*.pdf'))
    assert len(pdfs) == 3
    for pdf in pdfs:
        assert pdf.resolve().parent.parent.parent == root
        assert pdf.resolve().parent.name.startswith('request_')


def test_repeated_failed_logins_are_throttled(context):
    from app.api.routes import auth
    client, _, _ = context
    register_company(client, 7)
    try:
        for _ in range(auth.MAX_FAILURES):
            assert client.post('/auth/login', json={'email': 'owner7@gmail.com', 'password': 'Wrong@1234'}).status_code == 401
        blocked = client.post('/auth/login', json={'email': 'owner7@gmail.com', 'password': 'Password@123'})
        assert blocked.status_code == 429
        # Unknown emails get the same answer as wrong passwords.
        assert client.post('/auth/login', json={'email': 'nobody@example.com', 'password': 'Wrong@1234'}).status_code == 401
    finally:
        auth._failures.clear()
    assert client.post('/auth/login', json={'email': 'owner7@gmail.com', 'password': 'Password@123'}).status_code == 200


def test_image_bombs_are_rejected(context, tmp_path, monkeypatch):
    client, _, _ = context
    monkeypatch.setattr(settings, 'upload_storage', str(tmp_path / 'uploads'))
    _, headers, _, _ = prepare_approved_company(client)
    huge = _png(9000, 5000)  # 45 MP but only a few KB on disk
    assert len(huge) < 2_000_000
    design = client.post('/templates/image/analyze', headers=headers, files={'design': ('card.png', huge, 'image/png')})
    assert design.status_code == 413
    logo = client.post('/company/logo', headers=headers, files={'file': ('logo.png', huge, 'image/png')})
    assert logo.status_code == 413


def test_suspended_company_members_cannot_order(context):
    client, _, _ = context
    registration, headers, admin, template_id = prepare_approved_company(client)
    company_id = registration['company']['id']
    assert upload(client, headers, ['S-1,Sara Khan,Analyst,Finance,sara@example.com,555']).status_code == 201
    assert client.post('/auth/employee/register', json={'username': 'Sara Khan', 'email': 'sara@example.com', 'password': 'Password@123'}).status_code == 201
    employee = login(client, 'sara@example.com')
    assert client.patch(f'/admin/companies/{company_id}/status', headers=admin, json={'status': 'SUSPENDED'}).status_code == 200
    order = client.post(f'/employee/checkout/company/{company_id}', headers=employee, json={'quantity': 1, 'template_id': template_id})
    assert order.status_code == 403


def test_csv_export_neutralises_formulas_and_personal_cards_hide_paths(context):
    client, _, _ = context
    _, headers, _, _ = prepare_approved_company(client)
    assert client.post('/employees', headers=headers, json={
        'employee_id': 'F-1', 'name': '=HYPERLINK("http://evil")', 'designation': 'Staff', 'department': 'Ops',
        'email': 'f@example.com', 'phone': '+8801700000000',
    }).status_code == 201
    exported = client.get('/employees/export', headers=headers).text
    assert '\'=HYPERLINK' in exported
    assert "'+8801700000000" in exported

    assert client.post('/auth/employee/register', json={'username': 'Solo', 'email': 'solo@example.com', 'password': 'Password@123'}).status_code == 201
    solo = login(client, 'solo@example.com')
    assert client.post('/employee/checkout/personal', headers=solo, json={'quantity': 1, 'name': 'Solo'}).status_code == 201
    cards = client.get('/employee/personal-cards', headers=solo).json()
    assert cards and all('file_path' not in card for card in cards)


def test_exported_csv_can_be_imported_again(context):
    client, _, _ = context
    _, headers, _, _ = prepare_approved_company(client)
    assert upload(client, headers, ['R-1,Rafiq Islam,Engineer,Tech,rafiq@example.com,+8801711000000']).status_code == 201
    exported = client.get('/employees/export', headers=headers).text
    assert "'+8801711000000" in exported
    other_registration, other, _, _ = prepare_approved_company(client, 2)
    csv_text = '\n'.join(line.rsplit(',', 1)[0] for line in exported.strip().splitlines())  # drop the status column
    imported = client.post('/employees/import', headers=other, files={'file': ('again.csv', csv_text, 'text/csv')})
    assert imported.status_code == 201, imported.text
    phones = [e['phone'] for e in client.get('/employees', headers=other).json()]
    assert phones == ['+8801711000000']
