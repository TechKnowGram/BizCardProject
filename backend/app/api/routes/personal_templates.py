"""Card designs an individual employee uploads for their own personal cards.

The same machine-learning pipeline as company and shared templates reads the design
(see image_templates._analyze_files); only the owner differs. Files live in a private
folder per user (templates/user_<id>) and the designs are stored in personal_templates,
so they never show up in company or shared template lists.
"""

from __future__ import annotations

import anyio
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.api.routes.image_templates import ANALYSIS_LIMITER, _analyze_files, _check_assets, _check_layer_images, _read_design
from app.db.session import get_db
from app.models import PersonalTemplate, User
from app.models.constants import EMPLOYEE
from app.schemas.image_template import ImageTemplateCreate, TemplateAnalysis
from app.services.image_template_render import resolve_asset, user_owner

router = APIRouter(prefix='/employee/designs', tags=['Personal designs'])
MAX_PERSONAL_DESIGNS = 20


class PersonalTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    design: dict


@router.post('/analyze', response_model=TemplateAnalysis)
async def analyze_personal_design(
    design: UploadFile = File(..., description='The finished card design with sample text'),
    background: UploadFile | None = File(None, description='Optional: the same design with the sample text hidden'),
    side: str = Form('front', pattern='^(front|back)$'),
    user: User = Depends(require_roles([EMPLOYEE])),
):
    design_bytes = await _read_design(design)
    blank_bytes = await _read_design(background) if background is not None and background.filename else None
    return await anyio.to_thread.run_sync(_analyze_files, user_owner(user.id), design_bytes, blank_bytes, side, limiter=ANALYSIS_LIMITER)


@router.get('', response_model=list[PersonalTemplateResponse])
def list_personal_designs(db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    return db.scalars(select(PersonalTemplate).where(PersonalTemplate.user_id == user.id).order_by(PersonalTemplate.id.desc())).all()


@router.post('', response_model=PersonalTemplateResponse, status_code=201)
def create_personal_design(body: ImageTemplateCreate, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    owner = user_owner(user.id)
    if body.ai is not None:
        raise HTTPException(422, 'Illustrator files are not supported for personal designs; upload a PNG, JPG or WebP')
    if not any(f.role == 'name' for f in body.fields):
        raise HTTPException(422, 'Mark where your name goes before saving')
    count = len(db.scalars(select(PersonalTemplate.id).where(PersonalTemplate.user_id == user.id)).all())
    if count >= MAX_PERSONAL_DESIGNS:
        raise HTTPException(409, f'You can keep up to {MAX_PERSONAL_DESIGNS} designs. Delete one first.')
    _check_assets(owner, body.source, body.background)
    _check_layer_images(owner, body.fields)
    _check_assets(owner, *[o.file for o in body.overlays if o.file])
    if body.back and body.back.style == 'image':
        _check_assets(owner, body.back.source, body.back.background)
        _check_layer_images(owner, body.back.fields)
        _check_assets(owner, *[o.file for o in body.back.overlays if o.file])
    design = {
        'kind': 'image', 'owner': 'personal', 'company_id': None,
        'source': body.source, 'background': body.background, 'width': body.width, 'height': body.height,
        'fields': [f.model_dump() for f in body.fields],
        'overlays': [o.model_dump() for o in body.overlays],
        'back': body.back.model_dump() if body.back else None,
    }
    if body.width_pt and body.height_pt:
        design['width_pt'], design['height_pt'] = body.width_pt, body.height_pt
    template = PersonalTemplate(user_id=user.id, name=body.name, description=body.description, design=design)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete('/{template_id}', status_code=204)
def delete_personal_design(template_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    template = db.scalar(select(PersonalTemplate).where(PersonalTemplate.id == template_id, PersonalTemplate.user_id == user.id))
    if template is None:
        raise HTTPException(404, 'Design not found')
    db.delete(template)  # its files are swept by the unsaved-upload cleanup after a day
    db.commit()


@router.get('/assets/{file_name}')
def personal_design_asset(file_name: str, user: User = Depends(require_roles([EMPLOYEE]))):
    """Pictures of the signed-in employee's own designs only."""
    try:
        path = resolve_asset(user_owner(user.id), file_name)
    except ValueError:
        raise HTTPException(404, 'Not found') from None
    if not path.is_file():
        raise HTTPException(404, 'Not found')
    media_type = 'image/jpeg' if path.suffix.lower() in ('.jpg', '.jpeg') else 'image/png'
    return FileResponse(path, media_type=media_type, headers={'Cache-Control': 'private, max-age=3600'})
