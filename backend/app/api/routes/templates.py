from uuid import uuid4
from app.schemas.ai import CardDesign, DesignPrompt, DesignVariants, BrandKit, CardPreviewRequest
from app.services.ai_design import generate_design
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import require_approved_company_admin, require_system_admin
from app.db.session import get_db
from app.models import CardTemplate, User
from app.schemas.domain import TemplateCreate, TemplateResponse, TemplateUpdate

router = APIRouter(tags=['Templates'])


@router.get('/templates', response_model=list[TemplateResponse])
def list_active_templates(
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    return db.scalars(select(CardTemplate).where(CardTemplate.is_active.is_(True), or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == user.company_id)).order_by(CardTemplate.id)).all()


@router.post('/templates/{template_id}/select', response_model=TemplateResponse)
def select_template(
    template_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    template = db.scalar(select(CardTemplate).where(
        CardTemplate.id == template_id, CardTemplate.is_active.is_(True),
        or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == user.company_id)
    ))
    if template is None:
        raise HTTPException(status_code=404, detail='Active template not found')
    user.company.selected_template_id = template.id
    db.commit()
    return template


@router.get('/admin/templates', response_model=list[TemplateResponse])
def admin_list_templates(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return db.scalars(select(CardTemplate).where(CardTemplate.company_id.is_(None)).order_by(CardTemplate.id)).all()


@router.post('/admin/templates', response_model=TemplateResponse, status_code=201)
def create_template(
    body: TemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    template = CardTemplate(**body.model_dump())
    db.add(template)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Template name or style already exists') from None
    db.refresh(template)
    return template


@router.patch('/admin/templates/{template_id}', response_model=TemplateResponse)
def update_template(
    template_id: int,
    body: TemplateUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    template = db.get(CardTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail='Template not found')
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return template

# AI calls only return drafts; saving is an explicit separate action.

@router.post('/templates/ai/generate', response_model=CardDesign)
def generate_ai_template(body: DesignPrompt, user: User = Depends(require_approved_company_admin)):
    return generate_design(body, brand_kit=user.company.brand_kit)


@router.post('/templates/ai/save', response_model=TemplateResponse, status_code=201)
def save_ai_template(body: CardDesign, db: Session = Depends(get_db),
                     user: User = Depends(require_approved_company_admin)):
    suffix = uuid4().hex[:12]
    template = CardTemplate(company_id=user.company_id, name=f'{body.name} - {suffix}',
                            description=body.description, style_key=f'ai_{suffix}',
                            design=body.model_dump(), is_active=True)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get('/admin/templates/company-designs', response_model=list[TemplateResponse])
def company_designs(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return db.scalars(select(CardTemplate).where(CardTemplate.company_id.is_not(None)).order_by(CardTemplate.id.desc())).all()


@router.post('/admin/templates/{template_id}/save', response_model=TemplateResponse)
def save_to_shared_library(template_id: int, db: Session = Depends(get_db),
                           _: User = Depends(require_system_admin)):
    source = db.get(CardTemplate, template_id)
    if source is None or source.company_id is None or source.design is None:
        raise HTTPException(404, 'Company design not found')
    style_key = f'shared_{source.id}'
    existing = db.scalar(select(CardTemplate).where(CardTemplate.style_key == style_key))
    if existing:
        return existing
    shared = CardTemplate(name=f"{source.design['name']} - {uuid4().hex[:12]}",
                          description=source.description, style_key=style_key,
                          design=dict(source.design), is_active=True)
    db.add(shared)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(CardTemplate).where(CardTemplate.style_key == style_key))
        if existing:
            return existing
        raise
    db.refresh(shared)
    return shared


@router.post('/templates/ai/variations', response_model=DesignVariants)
def generate_three_designs(body: DesignPrompt, user: User = Depends(require_approved_company_admin)):
    return generate_design(body, brand_kit=user.company.brand_kit, variations=True)


@router.get('/templates/brand-kit', response_model=BrandKit)
def get_brand_kit(user: User = Depends(require_approved_company_admin)):
    return user.company.brand_kit or BrandKit().model_dump()


@router.put('/templates/brand-kit', response_model=BrandKit)
def save_brand_kit(body: BrandKit, db: Session = Depends(get_db),
                   user: User = Depends(require_approved_company_admin)):
    user.company.brand_kit = body.model_dump()
    db.commit()
    return body


@router.post('/templates/preview')
def preview_pdf(body: CardPreviewRequest, db: Session = Depends(get_db),
                user: User = Depends(require_approved_company_admin)):
    from tempfile import TemporaryDirectory
    from pathlib import Path
    from types import SimpleNamespace
    from fastapi.responses import Response
    from app.models import Employee
    from app.services.card_generation import render_card_pdf
    employee = SimpleNamespace(name='Alex Morgan', designation='Product Designer', department='Design',
                               email='hello@company.com', phone='+880 1700 000000', photo_path=None)
    if body.employee_id:
        employee = db.scalar(select(Employee).where(Employee.id == body.employee_id,
                             Employee.company_id == user.company_id, Employee.is_active.is_(True)))
        if employee is None:
            raise HTTPException(404, 'Employee not found')
    style_key = 'classic'
    design = body.design.model_dump() if body.design else None
    if body.template_id:
        template = db.scalar(select(CardTemplate).where(CardTemplate.id == body.template_id,
                             CardTemplate.is_active.is_(True),
                             or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == user.company_id)))
        if template is None:
            raise HTTPException(404, 'Active template not found')
        style_key, design = template.style_key, template.design
    with TemporaryDirectory(prefix='bizcard-preview-') as directory:
        path = Path(directory) / 'preview.pdf'
        render_card_pdf(path, user.company, employee, style_key, 'preview-not-issued', design)
        data = path.read_bytes()
    return Response(data, media_type='application/pdf', headers={
        'Content-Disposition': 'inline; filename="card-preview.pdf"', 'Cache-Control': 'no-store',
    })
