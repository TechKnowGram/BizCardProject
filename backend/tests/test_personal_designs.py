"""An individual employee can upload their own card design, and the same ML pipeline reads it.

Personal designs stay private to that employee, are printed on personal cards, and the
card can only be downloaded after the order is paid.
"""

from io import BytesIO

import pytest
from pypdf import PdfReader

from app.core.config import settings
from card_fixtures import layout_back, layout_photo_left
from test_mvp import approve_company, context, login, register_company  # noqa: F401  (fixture re-export)


def _employee(client, email):
    assert client.post('/auth/employee/register', json={'username': 'Nadia Islam', 'email': email, 'password': 'Password@123'}).status_code == 201
    return login(client, email)


@pytest.fixture
def employee(context, tmp_path, monkeypatch):
    client, _, _ = context
    monkeypatch.setattr(settings, 'upload_storage', str(tmp_path / 'uploads'))
    monkeypatch.setattr(settings, 'generated_card_storage', str(tmp_path / 'cards'))
    return client, _employee(client, 'nadia@example.com'), tmp_path


def _analyse(client, headers, path, side='front'):
    response = client.post('/employee/designs/analyze', headers=headers, data={'side': side},
                           files={'design': (path.name, path.read_bytes(), 'image/png')})
    assert response.status_code == 200, response.text
    return response.json()


def _save(client, headers, analysis, back=None, name='My card'):
    return client.post('/employee/designs', headers=headers, json={
        'name': name, 'source': analysis['source'], 'background': analysis['background'],
        'width': analysis['width'], 'height': analysis['height'], 'fields': analysis['fields'], 'back': back,
    })


def test_employee_uploads_design_and_orders_a_paid_two_sided_card(employee):
    client, headers, tmp = employee
    front = _analyse(client, headers, layout_photo_left(tmp / 'front.png'))
    assert {'name', 'title', 'phone', 'email'} <= {f['role'] for f in front['fields']}
    back = _analyse(client, headers, layout_back(tmp / 'back.png'), side='back')
    saved = _save(client, headers, front, back={'source': back['source'], 'background': back['background'],
                                                 'width': back['width'], 'height': back['height'], 'fields': back['fields']})
    assert saved.status_code == 201, saved.text
    design = saved.json()
    assert design['design']['owner'] == 'personal' and design['design']['back']
    assert client.get(f"/employee/designs/assets/{front['background']}", headers=headers).status_code == 200
    assert [d['id'] for d in client.get('/employee/designs', headers=headers).json()] == [design['id']]

    order = client.post('/employee/checkout/personal', headers=headers, json={
        'quantity': 1, 'name': 'Nadia Islam', 'designation': 'Architect', 'phone': '+880 1711 000 111',
        'personal_template_id': design['id'],
    })
    assert order.status_code == 201, order.text
    order_id = order.json()['order_id']
    assert order.json()['payment_status'] == 'PENDING_APPROVAL' and order.json()['card_ids'] == []
    assert client.get('/employee/personal-cards', headers=headers).json() == []
    assert client.post(f'/orders/{order_id}/pay', headers=headers, json={'method': 'CARD'}).status_code == 409

    # The system admin sees the order, previews the real card and approves it.
    admin = login(client, 'system@example.com')
    listed = client.get('/admin/personal-orders', headers=admin).json()
    assert listed[0]['id'] == order_id and listed[0]['status'] == 'PENDING_APPROVAL' and listed[0]['design_name'] == 'My card'
    preview = client.get(f'/admin/personal-orders/{order_id}/preview', headers=admin)
    assert preview.status_code == 200 and preview.content.startswith(b'%PDF')
    assert client.get('/admin/personal-orders', headers=headers).status_code == 403  # employees cannot review
    decided = client.patch(f'/admin/personal-orders/{order_id}/decision', headers=admin, json={'decision': 'APPROVED'})
    assert decided.status_code == 200 and decided.json()['status'] == 'PENDING_PAYMENT'
    assert client.patch(f'/admin/personal-orders/{order_id}/decision', headers=admin, json={'decision': 'APPROVED'}).status_code == 409

    card_id = client.get('/employee/personal-cards', headers=headers).json()[0]['id']
    assert client.get(f'/employee/personal-cards/{card_id}/download', headers=headers).status_code == 402
    assert client.post(f'/orders/{order_id}/pay', headers=headers, json={'method': 'CARD'}).status_code == 200
    pdf = client.get(f'/employee/personal-cards/{card_id}/download', headers=headers)
    assert pdf.status_code == 200
    reader = PdfReader(BytesIO(pdf.content))
    assert len(reader.pages) == 2
    assert 'Nadia Islam' in reader.pages[0].extract_text()


def test_personal_designs_are_private(employee, context):
    client, headers, tmp = employee
    analysis = _analyse(client, headers, layout_photo_left(tmp / 'front.png'))
    design = _save(client, headers, analysis).json()
    other = _employee(client, 'other@example.com')
    assert client.get('/employee/designs', headers=other).json() == []
    assert client.get(f"/employee/designs/assets/{analysis['background']}", headers=other).status_code == 404
    assert client.post('/employee/checkout/personal', headers=other, json={'quantity': 1, 'personal_template_id': design['id']}).status_code == 404
    # Another employee cannot save a design from someone else's upload.
    assert _save(client, other, analysis).status_code == 422
    # Personal designs never appear among company or shared templates.
    company, owner = register_company(client)
    approve_company(client, company['company']['id'], login(client, 'system@example.com'))
    assert all(t['name'] != 'My card' for t in client.get('/templates', headers=owner).json())
    assert client.delete(f"/employee/designs/{design['id']}", headers=other).status_code == 404
    assert client.delete(f"/employee/designs/{design['id']}", headers=headers).status_code == 204


def test_company_admin_cannot_use_personal_design_routes(employee, context):
    client, _, _ = employee
    _, owner = register_company(client)
    assert client.get('/employee/designs', headers=owner).status_code == 403


def test_photo_is_cropped_around_the_face():
    from PIL import Image, ImageDraw
    from app.services.photo_crop import crop_to_frame, parse_frame
    photo = Image.new('RGB', (1200, 800), 'white')
    # A "face" on the right of a wide photo, painted red so we can find it after cropping.
    face = (0.70, 0.20, 0.12, 0.18)
    x, y, w, h = face[0] * 1200, face[1] * 800, face[2] * 1200, face[3] * 800
    ImageDraw.Draw(photo).rectangle((x, y, x + w, y + h), fill=(255, 0, 0))
    crop = crop_to_frame(photo, 1.0, face)
    assert abs(crop.width - crop.height) <= 1
    red = [(i % crop.width, i // crop.width) for i, px in enumerate(crop.getdata()) if px == (255, 0, 0)]
    assert red, 'the face must be inside the crop'
    centre_x = sum(p[0] for p in red) / len(red) / crop.width
    centre_y = sum(p[1] for p in red) / len(red) / crop.height
    assert 0.4 < centre_x < 0.6        # centred horizontally (a plain centre crop would cut it off)
    assert 0.3 < centre_y < 0.55       # a little above the middle, leaving room for the shoulders
    assert all(0 <= px <= crop.width for px, _ in red)
    assert parse_frame('3:4') == 0.75 and parse_frame('0.75') == 0.75
    assert parse_frame('abc') is None and parse_frame('100') is None


def test_avatar_frame_endpoint_and_pdf_photo_fallback(employee):
    from io import BytesIO
    from PIL import Image
    client, headers, tmp = employee
    picture = BytesIO(); Image.new('RGB', (600, 900), (180, 140, 120)).save(picture, 'JPEG'); picture.seek(0)
    assert client.post('/auth/me/avatar', headers=headers, files={'file': ('me.jpg', picture.getvalue(), 'image/jpeg')}).status_code == 200
    framed = client.get('/auth/me/avatar?frame=1:1', headers=headers)
    assert framed.status_code == 200 and framed.headers['content-type'] == 'image/jpeg'
    image = Image.open(BytesIO(framed.content))
    assert abs(image.width - image.height) <= 2
    assert client.get('/auth/me/avatar?frame=nonsense', headers=headers).status_code == 200  # falls back to the original


def test_rejected_personal_order_cannot_be_paid(employee):
    client, headers, tmp = employee
    analysis = _analyse(client, headers, layout_photo_left(tmp / 'front.png'))
    design = _save(client, headers, analysis).json()
    order = client.post('/employee/checkout/personal', headers=headers, json={'quantity': 2, 'name': 'Nadia Islam', 'personal_template_id': design['id']}).json()
    admin = login(client, 'system@example.com')
    assert client.patch(f"/admin/personal-orders/{order['order_id']}/decision", headers=admin, json={'decision': 'REJECTED'}).status_code == 422
    rejected = client.patch(f"/admin/personal-orders/{order['order_id']}/decision", headers=admin, json={'decision': 'REJECTED', 'reason': 'Photo is blurry'})
    assert rejected.status_code == 200 and rejected.json()['status'] == 'REJECTED'
    mine = next(o for o in client.get('/employee/orders', headers=headers).json() if o['id'] == order['order_id'])
    assert mine['status'] == 'REJECTED' and mine['rejection_reason'] == 'Photo is blurry'
    assert client.post(f"/orders/{order['order_id']}/pay", headers=headers, json={'method': 'CARD'}).status_code == 409
    assert client.get('/employee/personal-cards', headers=headers).json() == []
