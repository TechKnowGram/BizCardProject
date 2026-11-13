"""End-to-end tests for templates made from an uploaded card design."""

from io import BytesIO

import pytest

from app.core.config import settings
from card_fixtures import layout_dark_title_above, layout_photo_left
from test_mvp import approve_company, context, login, register_company  # noqa: F401  (fixture re-export)


@pytest.fixture
def company(context, tmp_path, monkeypatch):
    client, _, _ = context
    monkeypatch.setattr(settings, 'upload_storage', str(tmp_path / 'uploads'))
    created, owner = register_company(client)
    approve_company(client, created['company']['id'], login(client, 'system@example.com'))
    return client, owner, created['company']['id'], tmp_path


def _upload(client, headers, path):
    return client.post('/templates/image/analyze', headers=headers,
                       files={'design': ('card.png', path.read_bytes(), 'image/png')})


def test_analyze_finds_fields_and_creates_working_template(company):
    client, owner, company_id, tmp = company
    response = _upload(client, owner, layout_photo_left(tmp / 'design.png'))
    assert response.status_code == 200, response.text
    analysis = response.json()
    roles = {f['role']: f for f in analysis['fields']}
    assert {'name', 'title', 'phone', 'email', 'address', 'photo', 'qr'} <= set(roles)
    assert 'Kyrie' in roles['name']['text']
    assert 'Manager' in roles['title']['text']
    assert roles['name']['bold'] is True
    assert roles['phone']['align'] == 'left'

    # The cleaned background and source are served to the company only.
    asset = client.get(f"/templates/image/assets/{company_id}/{analysis['background']}", headers=owner)
    assert asset.status_code == 200 and asset.content.startswith(b'\x89PNG')

    created = client.post('/templates/image', headers=owner, json={
        'name': 'Uploaded design', 'description': 'From Photoshop',
        'source': analysis['source'], 'background': analysis['background'],
        'width': analysis['width'], 'height': analysis['height'], 'fields': analysis['fields'],
    })
    assert created.status_code == 201, created.text
    template = created.json()
    assert template['design']['kind'] == 'image'
    assert template['design']['company_id'] == company_id
    assert any(t['id'] == template['id'] for t in client.get('/templates', headers=owner).json())

    employee = client.post('/employees', headers=owner, json={
        'employee_id': 'E-100', 'name': 'Farhana Akter Chowdhury', 'designation': 'Head of Finance',
        'department': 'Finance', 'email': 'farhana@example.com', 'phone': '+880 1711 204 518',
    })
    assert employee.status_code == 201, employee.text
    preview = client.post('/templates/preview', headers=owner,
                          json={'template_id': template['id'], 'employee_id': employee.json()['id']})
    assert preview.status_code == 200, preview.text
    assert preview.content.startswith(b'%PDF')


def test_title_above_name_layout(company):
    client, owner, _, tmp = company
    analysis = _upload(client, owner, layout_dark_title_above(tmp / 'dark.png')).json()
    roles = {f['role']: f for f in analysis['fields']}
    assert 'SEBASTIAN' in roles['name']['text'] and 'BENNETT' in roles['name']['text']
    assert roles['name']['lines'] == 2
    assert roles['title']['y'] < roles['name']['y']
    assert 'website' in roles


def test_assets_are_private_to_the_company(company):
    client, owner, company_id, tmp = company
    analysis = _upload(client, owner, layout_photo_left(tmp / 'design.png')).json()
    other, other_owner = register_company(client, 2)
    approve_company(client, other['company']['id'], login(client, 'system@example.com'))
    assert client.get(f"/templates/image/assets/{company_id}/{analysis['background']}", headers=other_owner).status_code == 404
    assert client.get(f'/templates/image/assets/{company_id}/..%2F..%2Fsecret.png', headers=owner).status_code == 404
    # Another company cannot save a template from someone else's upload.
    stolen = client.post('/templates/image', headers=other_owner, json={
        'name': 'Stolen', 'source': analysis['source'], 'background': analysis['background'],
        'width': analysis['width'], 'height': analysis['height'], 'fields': analysis['fields'],
    })
    assert stolen.status_code == 422


def test_rejects_bad_uploads_and_missing_name(company):
    client, owner, _, tmp = company
    wrong_type = client.post('/templates/image/analyze', headers=owner, files={'design': ('card.pdf', b'%PDF-1.4', 'application/pdf')})
    assert wrong_type.status_code == 415
    fake_png = client.post('/templates/image/analyze', headers=owner, files={'design': ('card.png', b'not an image', 'image/png')})
    assert fake_png.status_code == 422
    analysis = _upload(client, owner, layout_photo_left(tmp / 'design.png')).json()
    no_name = [f for f in analysis['fields'] if f['role'] != 'name']
    response = client.post('/templates/image', headers=owner, json={
        'name': 'No name', 'source': analysis['source'], 'background': analysis['background'],
        'width': analysis['width'], 'height': analysis['height'], 'fields': no_name,
    })
    assert response.status_code == 422


def test_demo_templates_are_retired_on_startup(context):
    from sqlalchemy import select
    from app.bootstrap import DEMO_STYLE_KEYS, retire_demo_templates
    from app.models import CardTemplate, Company
    client, sessions, _ = context
    created, owner = register_company(client)
    approve_company(client, created['company']['id'], login(client, 'system@example.com'))
    classic = next(t for t in client.get('/templates', headers=owner).json() if t['style_key'] == 'classic')
    assert client.post(f"/templates/{classic['id']}/select", headers=owner).status_code == 200
    with sessions() as db:
        retire_demo_templates(db)
        db.commit()
        assert not db.scalars(select(CardTemplate).where(CardTemplate.style_key.in_(DEMO_STYLE_KEYS), CardTemplate.is_active.is_(True))).all()
        assert db.get(Company, created['company']['id']).selected_template_id is None
    assert client.get('/templates', headers=owner).json() == []
    admin = login(client, 'system@example.com')
    assert [t for t in client.get('/admin/templates', headers=admin).json() if t['style_key'] in DEMO_STYLE_KEYS] == []


def test_two_sided_template_prints_front_and_back(company):
    from io import BytesIO
    from pypdf import PdfReader
    from card_fixtures import layout_back
    client, owner, _, tmp = company
    front = _upload(client, owner, layout_photo_left(tmp / 'front.png')).json()
    back = client.post('/templates/image/analyze', headers=owner, data={'side': 'back'},
                       files={'design': ('back.png', layout_back(tmp / 'back.png').read_bytes(), 'image/png')})
    assert back.status_code == 200, back.text
    back = back.json()
    roles = {f['role'] for f in back['fields']}
    assert 'company' in roles and 'website' in roles and 'name' not in roles
    assert not any('name field' in w for w in back['warnings'])
    back_fields = back['fields'] + [{'role': 'logo', 'x': 0.44, 'y': 0.2, 'w': 0.12, 'h': 0.18}]
    created = client.post('/templates/image', headers=owner, json={
        'name': 'Two sided', 'source': front['source'], 'background': front['background'],
        'width': front['width'], 'height': front['height'], 'fields': front['fields'],
        'back': {'source': back['source'], 'background': back['background'], 'width': back['width'], 'height': back['height'], 'fields': back_fields},
    })
    assert created.status_code == 201, created.text
    assert created.json()['design']['back']['fields']
    preview = client.post('/templates/preview', headers=owner, json={'template_id': created.json()['id']})
    assert preview.status_code == 200
    assert len(PdfReader(BytesIO(preview.content)).pages) == 2


def test_gemini_designs_are_retired_but_uploaded_designs_stay(company):
    from unittest.mock import patch  # noqa: F401
    from app.bootstrap import retire_gemini_templates
    from app.models import CardTemplate
    client, owner, company_id, tmp = company
    gemini = {'name': 'Ivory', 'description': 'AI made', 'background': '#FFFFFF', 'text': '#111111', 'accent': '#3267B0',
              'layout': 'left', 'decoration': 'stripe', 'font': 'Helvetica', 'two_sided': False}
    ai = client.post('/templates/ai/save', headers=owner, json=gemini)
    assert ai.status_code == 201, ai.text
    analysis = _upload(client, owner, layout_photo_left(tmp / 'design.png')).json()
    uploaded = client.post('/templates/image', headers=owner, json={
        'name': 'Uploaded', 'source': analysis['source'], 'background': analysis['background'],
        'width': analysis['width'], 'height': analysis['height'], 'fields': analysis['fields'],
    }).json()
    assert client.post(f"/templates/{ai.json()['id']}/select", headers=owner).status_code == 200
    sessions = client.app.dependency_overrides  # db comes from the test override
    from app.db.session import get_db
    db = next(sessions[get_db]())
    retire_gemini_templates(db)
    db.commit()
    ids = [t['id'] for t in client.get('/templates', headers=owner).json()]
    assert ai.json()['id'] not in ids and uploaded['id'] in ids


def test_automatic_back_needs_no_upload(company):
    from io import BytesIO
    from pypdf import PdfReader
    client, owner, _, tmp = company
    front = _upload(client, owner, layout_photo_left(tmp / 'front.png')).json()
    body = {'name': 'Auto back', 'source': front['source'], 'background': front['background'],
            'width': front['width'], 'height': front['height'], 'fields': front['fields']}
    bad = client.post('/templates/image', headers=owner, json={**body, 'back': {'style': 'auto', 'color': 'navy'}})
    assert bad.status_code == 422
    created = client.post('/templates/image', headers=owner, json={**body, 'back': {'style': 'auto', 'color': '#0E1A3B', 'show_qr': True}})
    assert created.status_code == 201, created.text
    assert created.json()['design']['back']['style'] == 'auto'
    preview = client.post('/templates/preview', headers=owner, json={'template_id': created.json()['id']})
    assert preview.status_code == 200
    reader = PdfReader(BytesIO(preview.content))
    assert len(reader.pages) == 2
    assert 'SCAN TO VERIFY' in reader.pages[1].extract_text()
    # The back can be switched off again later by sending front-only fields; or changed to another colour.
    updated = client.patch(f"/templates/image/{created.json()['id']}", headers=owner, json={'back': {'style': 'auto', 'color': '#FFFFFF', 'text_color': '#111111', 'show_qr': False}})
    assert updated.status_code == 200 and updated.json()['design']['back']['show_qr'] is False
