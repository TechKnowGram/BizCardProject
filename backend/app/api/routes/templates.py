from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
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
    _: User = Depends(require_approved_company_admin),
):
    return db.scalars(select(CardTemplate).where(CardTemplate.is_active.is_(True)).order_by(CardTemplate.id)).all()


@router.post('/templates/{template_id}/select', response_model=TemplateResponse)
def select_template(
    template_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    template = db.scalar(select(CardTemplate).where(
        CardTemplate.id == template_id, CardTemplate.is_active.is_(True)
    ))
    if template is None:
        raise HTTPException(status_code=404, detail='Active template not found')
    user.company.selected_template_id = template.id
    db.commit()
    return template


@router.get('/admin/templates', response_model=list[TemplateResponse])
def admin_list_templates(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return db.scalars(select(CardTemplate).order_by(CardTemplate.id)).all()


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
