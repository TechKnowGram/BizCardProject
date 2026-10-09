import json
from unittest.mock import patch
from urllib.error import HTTPError
from fastapi import HTTPException
from pydantic import SecretStr, ValidationError
import pytest
from test_mvp import context, prepare_approved_company, upload
from app.schemas.ai import CardDesign, DesignPrompt
from app.services.ai_design import generate_design
from app.core.config import settings

DESIGN = dict(name='Ivory Studio', description='A refined ivory card', background='#FFFFFF',
              text='#18233F', accent='#7755CC', layout='center', decoration='frame', font='Helvetica')


def test_ai_style_validation():
    assert CardDesign(**DESIGN).name == 'Ivory Studio'
    for change in ({'text': '#FFFFFF'}, {'font': '<script>'}, {'image_url': 'https://example.com'}):
        with pytest.raises(ValidationError):
            CardDesign(**{**DESIGN, **change})


def test_provider_contract_and_safe_errors(monkeypatch):
    monkeypatch.setattr(settings, 'gemini_api_key', SecretStr('test-key'))
    class Response:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self, count):
            return json.dumps({'choices': [{'message': {'content': json.dumps(DESIGN)}}]}).encode()
    with patch('app.services.ai_design.urlopen', return_value=Response()) as call:
        assert generate_design(DesignPrompt(prompt='Luxury ivory business card')).name == DESIGN['name']
        request = call.call_args.args[0]
        assert request.full_url.endswith('/openai/chat/completions')
        assert request.get_header('Authorization') == 'Bearer test-key'
        assert json.loads(request.data)['response_format']['type'] == 'json_schema'
    with patch('app.services.ai_design.urlopen', side_effect=HTTPError('url', 403, 'secret-provider-error', {}, None)):
        with pytest.raises(HTTPException) as error:
            generate_design(DesignPrompt(prompt='Luxury ivory business card'))
        assert error.value.status_code == 502
        assert 'secret-provider-error' not in error.value.detail


def test_ai_company_isolation_and_pdf(context):
    client, sessions, _ = context
    _, owner, admin, _ = prepare_approved_company(client)
    _, other, _, _ = prepare_approved_company(client, 2)
    with patch('app.api.routes.templates.generate_design', return_value=CardDesign(**DESIGN)):
        assert client.post('/templates/ai/generate', headers=owner, json={'prompt': 'Luxury ivory card please'}).status_code == 200
        assert client.post('/templates/ai/generate', headers=admin, json={'prompt': 'Luxury ivory card please'}).status_code == 403
    response = client.post('/templates/ai/save', headers=owner, json=DESIGN)
    assert response.status_code == 201, response.text
    template_id = response.json()['id']
    assert template_id not in [t['id'] for t in client.get('/templates', headers=other).json()]
    assert client.post(f'/templates/{template_id}/select', headers=other).status_code == 404
    assert client.post(f'/templates/{template_id}/select', headers=owner).status_code == 200
    assert upload(client, owner, ['AI-1,Alex Morgan,Designer,Design,alex@example.com,+8801700000000']).status_code == 201
    employee_id = client.get('/employees', headers=owner).json()[0]['id']
    response = client.post('/card-requests', headers=owner, json={'employee_ids': [employee_id], 'template_id': template_id})
    assert response.status_code == 201, response.text
    request_id = response.json()['id']
    decision = f'/admin/card-requests/{request_id}/decision'
    result = client.patch(decision, headers=admin, json={'decision': 'APPROVED'})
    assert result.status_code == 200, result.text
    assert result.json()['status'] == 'COMPLETED'
    cards = client.get(f'/card-requests/{request_id}/cards', headers=owner).json()
    assert len(cards) == 1
    assert client.get(f"/cards/{cards[0]['id']}/download", headers=owner).content.startswith(b'%PDF')
    assert client.patch(decision, headers=admin, json={'decision': 'APPROVED'}).status_code == 200
    assert len(client.get(f'/card-requests/{request_id}/cards', headers=owner).json()) == 1
    assert client.get(f"/cards/{cards[0]['id']}/download", headers=other).status_code == 404


def test_ai_missing_key_quota_and_invalid_output(monkeypatch):
    monkeypatch.setattr(settings, 'gemini_api_key', SecretStr(''))
    with pytest.raises(HTTPException) as error:
        generate_design(DesignPrompt(prompt='Luxury ivory business card'))
    assert error.value.status_code == 503
    monkeypatch.setattr(settings, 'gemini_api_key', SecretStr('test-key'))
    with patch('app.services.ai_design.urlopen', side_effect=HTTPError('url', 429, 'quota', {}, None)):
        with pytest.raises(HTTPException) as error:
            generate_design(DesignPrompt(prompt='Luxury ivory business card'))
        assert error.value.status_code == 429
    class BadResponse:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self, count): return b'{"choices":[{"message":{"content":"not json"}}]}'
    with patch('app.services.ai_design.urlopen', return_value=BadResponse()):
        with pytest.raises(HTTPException) as error:
            generate_design(DesignPrompt(prompt='Luxury ivory business card'))
        assert error.value.status_code == 502


def test_ai_pending_company_and_invalid_prompt(context):
    from test_mvp import register_company
    client, _, _ = context
    _, owner = register_company(client)
    assert client.post('/templates/ai/save', headers=owner, json=DESIGN).status_code == 403
    assert client.post('/templates/ai/generate', headers=owner, json={'prompt': 'Luxury ivory card please'}).status_code == 403
    _, approved, _, _ = prepare_approved_company(client, 2)
    assert client.post('/templates/ai/generate', headers=approved, json={'prompt': 'x'}).status_code == 422
    assert client.post('/templates/ai/save', headers=approved, json={**DESIGN, 'text': '#FFFFFF'}).status_code == 422


def test_company_design_requires_explicit_admin_library_save(context):
    client, _, _ = context
    _, owner, admin, _ = prepare_approved_company(client)
    _, other, _, _ = prepare_approved_company(client, 2)
    private = client.post('/templates/ai/save', headers=owner, json=DESIGN).json()
    assert private['id'] not in [t['id'] for t in client.get('/admin/templates', headers=admin).json()]
    assert private['id'] in [t['id'] for t in client.get('/admin/templates/company-designs', headers=admin).json()]
    path = f"/admin/templates/{private['id']}/save"
    assert client.post(path, headers=owner).status_code == 403
    response = client.post(path, headers=admin)
    assert response.status_code == 200
    shared = response.json()
    assert shared['company_id'] is None
    assert shared['id'] != private['id']
    assert shared['design'] == private['design']
    assert shared['id'] in [t['id'] for t in client.get('/templates', headers=other).json()]
    assert client.post(path, headers=admin).json()['id'] == shared['id']
    assert private['id'] not in [t['id'] for t in client.get('/templates', headers=other).json()]


def test_brand_kit_isolation_and_three_variations(context):
    from app.schemas.ai import DesignVariants
    client, _, _ = context
    _, owner, _, _ = prepare_approved_company(client)
    _, other, _, _ = prepare_approved_company(client, 2)
    kit = {'background': '#FFFFFF', 'text': '#112233', 'accent': '#FF9900', 'font': 'Times-Roman'}
    assert client.put('/templates/brand-kit', headers=owner, json=kit).status_code == 200
    assert client.get('/templates/brand-kit', headers=owner).json() == kit
    assert client.get('/templates/brand-kit', headers=other).json()['accent'] != kit['accent']
    assert client.put('/templates/brand-kit', headers=owner, json={**kit, 'text': '#FFFFFF'}).status_code == 422
    variants = DesignVariants(designs=[CardDesign(**{**DESIGN, 'name': f'Style {i}'}) for i in range(3)])
    with patch('app.api.routes.templates.generate_design', return_value=variants) as mocked:
        result = client.post('/templates/ai/variations', headers=owner, json={'prompt': 'Make original professional styles'})
        assert result.status_code == 200, result.text
        assert len(result.json()['designs']) == 3
        assert mocked.call_args.kwargs == {'brand_kit': kit, 'variations': True}


def test_actual_pdf_preview_and_two_sided_generation(context):
    import io
    from pypdf import PdfReader
    from sqlalchemy import select, func
    from app.models import GeneratedCard
    client, sessions, _ = context
    _, owner, admin, _ = prepare_approved_company(client)
    _, other, _, _ = prepare_approved_company(client, 2)
    assert upload(client, owner, ['PDF-1,Alex Morgan,Designer,Design,alex@example.com,+8801700000000']).status_code == 201
    employee_id = client.get('/employees', headers=owner).json()[0]['id']
    design = {**DESIGN, 'two_sided': True}
    response = client.post('/templates/preview', headers=owner, json={'design': design, 'employee_id': employee_id})
    assert response.status_code == 200, response.text
    pdf = PdfReader(io.BytesIO(response.content))
    assert len(pdf.pages) == 2
    assert 'Alex Morgan' in pdf.pages[0].extract_text()
    assert 'Company 1' in pdf.pages[1].extract_text()
    for page in pdf.pages:
        assert float(page.mediabox.width) == 252
        assert float(page.mediabox.height) == 144
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(GeneratedCard)) == 0
    assert client.post('/templates/preview', headers=other, json={'design': design, 'employee_id': employee_id}).status_code == 404
    template = client.post('/templates/ai/save', headers=owner, json=design).json()
    assert client.post('/templates/preview', headers=other, json={'template_id': template['id']}).status_code == 404
    assert client.post('/templates/preview', headers=owner, json={'template_id': template['id'], 'design': design}).status_code == 422
    assert client.post(f"/templates/{template['id']}/select", headers=owner).status_code == 200
    request = client.post('/card-requests', headers=owner, json={'employee_ids': [employee_id], 'template_id': template['id']}).json()
    assert client.patch(f"/admin/card-requests/{request['id']}/decision", headers=admin, json={'decision': 'APPROVED'}).status_code == 200
    cards = client.get(f"/card-requests/{request['id']}/cards", headers=owner).json()
    data = client.get(f"/cards/{cards[0]['id']}/download", headers=owner).content
    assert len(PdfReader(io.BytesIO(data)).pages) == 2


def test_long_labels_fit_card_width():
    from app.services.card_generation import fit_card_label
    from reportlab.pdfbase.pdfmetrics import stringWidth
    class CanvasStub:
        def setFont(self, font, size): self.size = size
    canvas = CanvasStub()
    value = fit_card_label(canvas, 'A very long company name ' * 20, 'Helvetica', 18, 155)
    assert value.endswith('...')
    assert stringWidth(value, 'Helvetica', canvas.size) <= 155
