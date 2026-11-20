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


def test_added_text_and_picture_layers_are_saved_and_printed(company):
    from PIL import Image

    client, owner, _, tmp = company
    analysis = _upload(client, owner, layout_photo_left(tmp / 'design.png')).json()
    badge = BytesIO()
    Image.new('RGBA', (60, 40), (200, 30, 30, 180)).save(badge, 'PNG')
    stored = client.post('/templates/image/layer', headers=owner, files={'image': ('badge.png', badge.getvalue(), 'image/png')})
    assert stored.status_code == 200, stored.text
    layer = stored.json()
    assert layer['file'].endswith('_layer.png') and (layer['width'], layer['height']) == (60, 40)

    extra = [
        {'role': 'static_text', 'x': 0.1, 'y': 0.9, 'w': 0.5, 'h': 0.06, 'text': 'Since 1999', 'size': 0.05},
        {'role': 'static_image', 'x': 0.7, 'y': 0.05, 'w': 0.2, 'h': 0.15, 'image': layer['file']},
    ]
    body = {'name': 'With layers', 'description': '', 'source': analysis['source'], 'background': analysis['background'],
            'width': analysis['width'], 'height': analysis['height'], 'fields': [*analysis['fields'], *extra]}
    created = client.post('/templates/image', headers=owner, json=body)
    assert created.status_code == 201, created.text
    assert {f['role'] for f in created.json()['design']['fields']} >= {'static_text', 'static_image'}

    employee = client.post('/employees', headers=owner, json={
        'employee_id': 'E-200', 'name': 'Farhana Akter', 'designation': 'Head', 'department': 'Finance',
        'email': 'f@example.com', 'phone': '+880 1711 204 518'}).json()
    preview = client.post('/templates/preview', headers=owner, json={'template_id': created.json()['id'], 'employee_id': employee['id']})
    assert preview.status_code == 200 and preview.content.startswith(b'%PDF')

    # A layer that points at a missing picture, or an empty text layer, is refused.
    missing = {**body, 'name': 'Broken', 'fields': [*analysis['fields'], {'role': 'static_image', 'x': 0.1, 'y': 0.1, 'w': 0.2, 'h': 0.2, 'image': 'nope.png'}]}
    assert client.post('/templates/image', headers=owner, json=missing).status_code == 422
    empty = {**body, 'name': 'Empty text', 'fields': [*analysis['fields'], {'role': 'static_text', 'x': 0.1, 'y': 0.1, 'w': 0.2, 'h': 0.1, 'text': '  '}]}
    assert client.post('/templates/image', headers=owner, json=empty).status_code == 422


def test_layers_can_sit_between_bands_of_artwork(company):
    client, owner, _, tmp = company
    analysis = _upload(client, owner, layout_photo_left(tmp / 'design.png')).json()
    # A band of artwork drawn above the fields whose z is lower than the band's z.
    fields = [({**f, 'z': 3} if f['role'] == 'name' else f) for f in analysis['fields']]
    body = {'name': 'Banded', 'description': '', 'source': analysis['source'], 'background': analysis['background'],
            'width': analysis['width'], 'height': analysis['height'], 'fields': fields,
            'overlays': [{'file': analysis['source'], 'z': 3}, {'file': '', 'z': 9}]}
    created = client.post('/templates/image', headers=owner, json=body)
    assert created.status_code == 201, created.text
    assert created.json()['design']['overlays'][0]['z'] == 3
    employee = client.post('/employees', headers=owner, json={
        'employee_id': 'E-300', 'name': 'Farhana Akter', 'designation': 'Head', 'department': 'Finance',
        'email': 'f2@example.com', 'phone': '+880 1711 204 518'}).json()
    preview = client.post('/templates/preview', headers=owner, json={'template_id': created.json()['id'], 'employee_id': employee['id']})
    assert preview.status_code == 200 and preview.content.startswith(b'%PDF')
    missing = client.post('/templates/image', headers=owner, json={**body, 'name': 'Bad band', 'overlays': [{'file': 'nope.png', 'z': 3}]})
    assert missing.status_code == 422


def test_admin_can_reopen_and_edit_a_shared_template(company):
    client, owner, _, tmp = company
    admin = login(client, 'system@example.com')
    analysis = client.post('/templates/image/analyze', headers=admin,
                           files={'design': ('card.png', layout_photo_left(tmp / 'design.png').read_bytes(), 'image/png')}).json()
    body = {'name': 'Shared look', 'description': 'first', 'source': analysis['source'], 'background': analysis['background'],
            'width': analysis['width'], 'height': analysis['height'], 'fields': analysis['fields']}
    created = client.post('/templates/image', headers=admin, json=body)
    assert created.status_code == 201, created.text
    template = created.json()
    assert template['company_id'] is None and template['design']['company_id'] == 0

    opened = client.post(f"/admin/templates/{template['id']}/workspace", headers=admin)
    assert opened.status_code == 200, opened.text
    session = opened.json()
    assert session['name'] == 'Shared look' and session['result']['upload_id'] == ''
    assert {f['role'] for f in session['result']['front']['fields']} >= {'name', 'photo'}
    # Companies cannot open the admin's editing session.
    assert client.post(f"/admin/templates/{template['id']}/workspace", headers=owner).status_code == 403

    fields = [({**f, 'z': 2} if f['role'] == 'photo' else f) for f in session['result']['front']['fields']]
    edited = client.patch(f"/templates/image/{template['id']}", headers=admin, json={
        'name': 'Shared look 2', 'description': 'second', 'fields': fields, 'overlays': [{'file': '', 'z': 2}]})
    assert edited.status_code == 200, edited.text
    assert edited.json()['design']['overlays'] == [{'file': '', 'z': 2}]
    assert [f['z'] for f in edited.json()['design']['fields'] if f['role'] == 'photo'] == [2]
    assert client.patch(f"/templates/image/{template['id']}", headers=admin, json={'background': 'nope.png', 'width': 10, 'height': 10}).status_code == 422
    # A company's own design is not opened through the admin route.
    own = client.post('/templates/image/analyze', headers=owner, files={'design': ('c.png', layout_photo_left(tmp / 'd2.png').read_bytes(), 'image/png')}).json()
    mine = client.post('/templates/image', headers=owner, json={**body, 'name': 'Company look', 'source': own['source'], 'background': own['background'], 'fields': own['fields']})
    assert client.post(f"/admin/templates/{mine.json()['id']}/workspace", headers=admin).status_code == 404

    shape = client.post('/admin/templates/design', headers=admin, json={
        'name': 'Midnight', 'description': 'dark', 'background': '#18233F', 'text': '#FFFFFF', 'accent': '#6D7CFF',
        'layout': 'left', 'decoration': 'stripe', 'font': 'Helvetica', 'two_sided': False}).json()
    changed = client.patch(f"/admin/templates/{shape['id']}/design", headers=admin, json={
        'name': 'Dawn', 'description': 'light', 'background': '#FFFFFF', 'text': '#111111', 'accent': '#FF8800',
        'layout': 'center', 'decoration': 'sun', 'font': 'Helvetica', 'two_sided': False})
    assert changed.status_code == 200, changed.text
    assert changed.json()['design']['decoration'] == 'sun' and changed.json()['name'] == 'Dawn'


def _tiny_illustrator_file() -> bytes:
    """A one-page PDF standing in for an .ai file: a red rectangle, a line of text and a small picture."""
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen.canvas import Canvas
    from PIL import Image

    buffer = BytesIO()
    canvas = Canvas(buffer, pagesize=(252, 144))
    canvas.setFillColorRGB(0.8, 0.1, 0.2)
    canvas.rect(10, 10, 100, 40, fill=1, stroke=0)
    canvas.setFillColorRGB(0, 0, 0)
    canvas.setFont('Helvetica-Bold', 14)
    canvas.drawString(20, 100, 'Hello layers')
    picture = BytesIO()
    Image.new('RGB', (20, 20), (0, 120, 200)).save(picture, 'PNG')
    picture.seek(0)
    canvas.drawImage(ImageReader(picture), 150, 20, 40, 40)
    canvas.showPage()
    canvas.save()
    return buffer.getvalue()


def test_layers_are_svg_text_and_pictures_in_a_folder_per_project(company):
    from app.services.image_template_render import project_folder

    client, owner, company_id, tmp = company
    uploaded = client.post('/templates/illustrator/artboards', headers=owner, files={'file': ('card.ai', _tiny_illustrator_file(), 'application/octet-stream')})
    assert uploaded.status_code == 200, uploaded.text
    upload_id = uploaded.json()['upload_id']
    project = project_folder(company_id, upload_id)
    assert (project / 'design.ai').is_file() and (project / 'previews' / 'artboard-0.jpg').is_file()
    # The artboard preview is served from the project's own route.
    preview = client.get(f"/templates/image/projects/{upload_id}/{uploaded.json()['artboards'][0]['preview']}", headers=owner)
    assert preview.status_code == 200 and preview.headers['content-type'] == 'image/jpeg'

    pieces = client.post('/templates/illustrator/pieces', headers=owner, json={'upload_id': upload_id, 'artboard': 0})
    assert pieces.status_code == 200, pieces.text
    by_kind = {p['kind']: p for p in pieces.json()['pieces']}
    assert by_kind['path']['format'] == 'svg' and by_kind['path']['file'].endswith('.svg')
    assert by_kind['text']['format'] == 'text' and by_kind['text']['file'] is None and by_kind['text']['text'] == 'Hello layers'
    assert by_kind['text']['bold'] is True and by_kind['text']['size_pt'] == 14
    assert by_kind['image']['format'] == 'png' and by_kind['image']['file'].endswith('.png')
    shape = client.get(f"/templates/image/projects/{upload_id}/{by_kind['path']['file']}", headers=owner)
    assert shape.status_code == 200 and shape.headers['content-type'] == 'image/svg+xml' and b'<path' in shape.content and b'rgb(204,26,51)' in shape.content
    assert (project / 'artboard-0').is_dir()

    # Nothing outside the project can be reached, and other users cannot read it.
    assert client.get(f'/templates/image/projects/{upload_id}/..%2F..%2Fsecret.png', headers=owner).status_code == 404
    other, other_owner = register_company(client, 2)
    approve_company(client, other['company']['id'], login(client, 'system@example.com'))
    assert client.get(f"/templates/image/projects/{upload_id}/{by_kind['path']['file']}", headers=other_owner).status_code == 404

    # Finishing deletes the whole project folder.
    assert client.delete(f'/templates/illustrator/session/{upload_id}', headers=owner).status_code == 204
    assert not project.exists()
    assert client.delete('/templates/illustrator/session/not-an-id', headers=owner).status_code == 422


def test_exit_without_saving_can_discard_the_analysis_pictures(company):
    from app.services.image_template_render import template_folder

    client, owner, company_id, tmp = company
    folder = template_folder(company_id)
    folder.mkdir(parents=True, exist_ok=True)
    mine = [folder / ('ab' * 16 + '_source.png'), folder / ('ab' * 16 + '_background.png')]
    other = [folder / 'secret.png', folder / ('cd' * 16 + '_layer.png')]
    for path in [*mine, *other]:
        path.write_bytes(b'x')
    query = '&'.join(f'discard={p.name}' for p in [*mine, *other])
    assert client.delete(f"/templates/illustrator/session/{'ef' * 16}?{query}", headers=owner).status_code == 204
    assert not any(p.exists() for p in mine)
    assert all(p.exists() for p in other)  # only analysis pictures can be discarded


def test_layers_removed_in_the_workspace_are_removed_from_the_saved_ai_file(company):
    import pypdfium2 as pdfium

    from app.services.image_template_render import template_folder

    client, _, _, tmp = company
    admin = login(client, 'system@example.com')
    uploaded = client.post('/templates/illustrator/artboards', headers=admin, files={'file': ('card.ai', _tiny_illustrator_file(), 'application/octet-stream')}).json()
    upload_id = uploaded['upload_id']
    analysis = client.post('/templates/illustrator/analyze', headers=admin, json={'upload_id': upload_id, 'front': 0, 'back': None}).json()['front']
    name_box = {'role': 'name', 'x': 0.1, 'y': 0.2, 'w': 0.5, 'h': 0.1, 'text': 'Hello layers', 'size': 0.1}
    body = {'name': 'Trimmed', 'description': '', 'source': analysis['source'], 'background': analysis['background'],
            'width': analysis['width'], 'height': analysis['height'], 'fields': [name_box],
            'ai': {'upload_id': upload_id, 'front': 0, 'remove_front': [0]}}

    def objects(file_name):
        document = pdfium.PdfDocument((template_folder(None) / file_name).read_bytes())
        try:
            return len(list(document[0].get_objects(max_depth=0)))
        finally:
            document.close()

    created = client.post('/templates/image', headers=admin, json=body)
    assert created.status_code == 201, created.text
    template = created.json()
    first = template['design']['ai']['file']
    assert objects(first) == 2  # the rectangle (object 0) is gone from the saved .ai

    # Reopen it, delete one more layer, save: the stored .ai is replaced by one without it.
    session = client.post(f"/admin/templates/{template['id']}/workspace", headers=admin).json()
    edited = client.patch(f"/templates/image/{template['id']}", headers=admin, json={
        'ai_edit': {'upload_id': session['result']['upload_id'], 'remove_front': [0]}})
    assert edited.status_code == 200, edited.text
    second = edited.json()['design']['ai']['file']
    assert second != first and objects(second) == 1
    assert not (template_folder(None) / first).exists()
    # A changed .ai file can still make a card.
    assert client.patch(f"/templates/image/{template['id']}", headers=admin, json={'ai_edit': {'upload_id': 'ab' * 16}}).status_code == 422


@pytest.mark.parametrize('shape', ['circle', 'rect'])
def test_photo_field_matches_the_real_frame_around_a_face(shape, tmp_path):
    """With the face model installed, the photo field is the design's own frame, not just the face.
    Otherwise the new photo would be too small and the sample photo would show around it."""
    from pathlib import Path
    from PIL import Image, ImageDraw
    from app.services.template_ml import _face_model_path, analyze, load_image
    headshot = Path(__file__).resolve().parents[2] / 'img' / 'Professional South Asian LinkedIn Headshot.png'
    if not _face_model_path().exists() or not headshot.exists():
        pytest.skip('face model or sample photo not available')
    from card_fixtures import _font
    card = Image.new('RGB', (1050, 600), (236, 242, 250))
    draw = ImageDraw.Draw(card)
    draw.rectangle((0, 0, 380, 600), fill=(16, 24, 69))
    cx, cy, r = 190, 300, 140
    photo = Image.open(headshot).convert('RGB').resize((2 * r, 2 * r))
    if shape == 'circle':
        mask = Image.new('L', (2 * r, 2 * r), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, 2 * r - 1, 2 * r - 1), fill=255)
        draw.ellipse((cx - r - 8, cy - r - 8, cx + r + 8, cy + r + 8), fill=(255, 255, 255))
        card.paste(photo, (cx - r, cy - r), mask)
    else:
        draw.rectangle((cx - r - 8, cy - r - 8, cx + r + 8, cy + r + 8), fill=(201, 162, 39))
        card.paste(photo, (cx - r, cy - r))
    draw.text((440, 150), 'Ayesha Rahman', font=_font(60, True), fill=(16, 24, 69))
    draw.text((442, 225), 'Senior Software Engineer', font=_font(30), fill=(50, 103, 176))
    draw.text((442, 320), '+880 1711 204 518', font=_font(28), fill=(30, 30, 30))
    card.save(tmp_path / 'card.png')
    photo_field = next(f for f in analyze(load_image(tmp_path / 'card.png')).fields if f.role == 'photo')
    assert photo_field.shape == shape
    for got, want in ((photo_field.x * 1050, cx - r), (photo_field.y * 600, cy - r), (photo_field.w * 1050, 2 * r), (photo_field.h * 600, 2 * r)):
        assert abs(got - want) <= 6, (got, want)


def _as_psd(png_path) -> bytes:
    """A minimal flattened Photoshop file (RGB, 8-bit, raw) of the same picture, built by hand."""
    import struct
    from PIL import Image
    image = Image.open(png_path).convert('RGB')
    width, height = image.size
    header = b'8BPS' + struct.pack('>H6xHIIHH', 1, 3, height, width, 8, 3)
    sections = struct.pack('>III', 0, 0, 0)  # colour mode data, image resources, layers: none
    planes = b''.join(band.tobytes() for band in image.split())
    return header + sections + struct.pack('>H', 0) + planes


def test_photoshop_psd_design_is_read_like_an_image(company):
    client, owner, _, tmp = company
    psd = _as_psd(layout_photo_left(tmp / 'design.png'))
    response = client.post('/templates/image/analyze', headers=owner,
                           files={'design': ('card.psd', psd, 'image/vnd.adobe.photoshop')})
    assert response.status_code == 200, response.text
    roles = {f['role'] for f in response.json()['fields']}
    assert {'name', 'title', 'phone', 'email'} <= roles
    # A file named .psd that is not a Photoshop file is refused.
    fake = client.post('/templates/image/analyze', headers=owner, files={'design': ('card.psd', b'not a psd', 'application/octet-stream')})
    assert fake.status_code == 422
