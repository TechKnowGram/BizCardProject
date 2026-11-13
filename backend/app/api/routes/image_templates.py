"""Templates made from an uploaded card design (for example exported from Photoshop).

Flow:
1. POST /templates/image/analyze  - upload the design; the ML pipeline finds the
   name, title, contact rows, photo frame and a QR spot, and cleans the sample
   text off the background. Nothing is saved as a template yet.
2. The company admin reviews and adjusts the fields in the editor.
3. POST /templates/image          - save it as one of the company's templates.
Cards are then generated through the normal request/approval flow.
"""

from __future__ import annotations

import os

# Refuse absurd pixel counts before OpenCV decodes anything (decompression bombs).
os.environ.setdefault('CV_IO_MAX_IMAGE_PIXELS', str(40_000_000))

from uuid import uuid4

import cv2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
import time

import anyio
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_current_user, require_approved_company_admin
from app.db.session import get_db
from app.models import CardTemplate, User
from app.models.constants import COMPANY_ADMIN, EMPLOYEE, SYSTEM_ADMIN
from app.models.domain import Membership
from app.schemas.domain import TemplateResponse
from app.schemas.image_template import ImageTemplateCreate, ImageTemplateUpdate, TemplateAnalysis
from app.services.assets import check_pixels
from app.services.image_template_render import resolve_asset, template_folder

router = APIRouter(tags=['Image templates'])

MAX_DESIGN_BYTES = 10_000_000
# OCR and inpainting are CPU-heavy: run at most two at a time so they cannot starve the API.
ANALYSIS_LIMITER = anyio.CapacityLimiter(2)
# Uploaded designs that were never saved as a template are removed after this long.
UNSAVED_MAX_AGE_SECONDS = 24 * 60 * 60
IMAGE_SIGNATURES = {
    'image/png': (b'\x89PNG\r\n\x1a\n',),
    'image/jpeg': (b'\xff\xd8\xff',),
    'image/webp': (b'RIFF',),
}


async def _read_design(file: UploadFile) -> bytes:
    signatures = IMAGE_SIGNATURES.get(file.content_type or '')
    if signatures is None:
        raise HTTPException(415, 'Upload the card design as a PNG, JPG or WebP image')
    content = await file.read(MAX_DESIGN_BYTES + 1)
    if not content:
        raise HTTPException(400, 'The file is empty')
    if len(content) > MAX_DESIGN_BYTES:
        raise HTTPException(413, 'The design must be 10 MB or smaller')
    if not any(content.startswith(s) for s in signatures) or (file.content_type == 'image/webp' and content[8:12] != b'WEBP'):
        raise HTTPException(422, 'The file content does not match its type')
    check_pixels(content)
    return content


def _analyze_files(company_id: int, design: bytes, blank: bytes | None, side: str = 'front') -> dict:
    """CPU-heavy: runs OCR and image processing. Called in a worker thread."""
    import numpy as np
    from app.services.template_ml import analyze, clean_background, load_image

    folder = template_folder(company_id)
    folder.mkdir(parents=True, exist_ok=True)
    _remove_unsaved_uploads(company_id)
    stem = uuid4().hex
    raw_path = folder / f'{stem}_upload'
    raw_path.write_bytes(design)
    try:
        image = load_image(raw_path)
    except ValueError as exc:
        raw_path.unlink(missing_ok=True)
        raise HTTPException(422, str(exc)) from None
    raw_path.unlink(missing_ok=True)

    analysis = analyze(image)
    if side == 'back':
        # The back of a card carries the company, not a person: the biggest text is the
        # company name and a line under it is usually a slogan that stays as designed.
        for field in analysis.fields:
            if field.role == 'name':
                field.role = 'company'
            elif field.role == 'title':
                field.role = 'other'
        analysis.warnings = [w for w in analysis.warnings if 'name field' not in w and 'photo frame' not in w]
    if blank:
        clean = cv2.imdecode(np.frombuffer(blank, np.uint8), cv2.IMREAD_COLOR)
        if clean is None:
            raise HTTPException(422, 'The blank background is not a readable image')
        clean = cv2.resize(clean, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_AREA)
    else:
        clean = clean_background(image, analysis.fields)

    source_name, background_name = f'{stem}_source.png', f'{stem}_background.png'
    try:
        cv2.imwrite(str(folder / source_name), image)
        cv2.imwrite(str(folder / background_name), clean)
    except Exception:
        for name in (source_name, background_name):
            (folder / name).unlink(missing_ok=True)
        raise
    data = analysis.to_dict()
    return {'source': source_name, 'background': background_name, **data}


def _remove_unsaved_uploads(company_id: int) -> None:
    """Delete analysed designs older than a day that no saved template uses."""
    from app.db.session import SessionLocal

    folder = template_folder(company_id)
    cutoff = time.time() - UNSAVED_MAX_AGE_SECONDS
    old = [p for p in folder.glob('*.png') if p.stat().st_mtime < cutoff]
    if not old:
        return
    with SessionLocal() as db:
        used: set[str] = set()
        for design in db.scalars(select(CardTemplate.design).where(CardTemplate.company_id == company_id)):
            if design and design.get('kind') == 'image':
                used.update({design.get('source', ''), design.get('background', '')})
                if (design.get('back') or {}).get('source'):
                    used.update({design['back'].get('source', ''), design['back'].get('background', '')})
    for path in old:
        if path.name not in used:
            path.unlink(missing_ok=True)


@router.post('/templates/image/analyze', response_model=TemplateAnalysis)
async def analyze_design(
    design: UploadFile = File(..., description='The finished card design with sample text'),
    background: UploadFile | None = File(None, description='Optional: the same design with the sample text hidden'),
    side: str = Form('front', pattern='^(front|back)$'),
    user: User = Depends(require_approved_company_admin),
):
    design_bytes = await _read_design(design)
    blank_bytes = await _read_design(background) if background is not None and background.filename else None
    return await anyio.to_thread.run_sync(_analyze_files, user.company_id, design_bytes, blank_bytes, side, limiter=ANALYSIS_LIMITER)


def _check_assets(company_id: int, *names: str) -> None:
    for name in names:
        try:
            path = resolve_asset(company_id, name)
        except ValueError:
            raise HTTPException(422, 'Invalid template file') from None
        if not path.is_file():
            raise HTTPException(422, 'The uploaded design was not found; upload it again')


@router.post('/templates/image', response_model=TemplateResponse, status_code=201)
def create_image_template(body: ImageTemplateCreate, db: Session = Depends(get_db),
                          user: User = Depends(require_approved_company_admin)):
    _check_assets(user.company_id, body.source, body.background)
    if body.back and body.back.style == 'image':
        _check_assets(user.company_id, body.back.source, body.back.background)
    if not any(f.role == 'name' for f in body.fields):
        raise HTTPException(422, 'Mark where the employee name goes before saving')
    if db.scalar(select(CardTemplate).where(CardTemplate.name == body.name)):
        raise HTTPException(409, 'A template with this name already exists')
    design = {
        'kind': 'image', 'source': body.source, 'background': body.background,
        'company_id': user.company_id, 'width': body.width, 'height': body.height,
        'fields': [f.model_dump() for f in body.fields],
        'back': body.back.model_dump() if body.back else None,
    }
    template = CardTemplate(company_id=user.company_id, name=body.name, description=body.description,
                            style_key=f'img_{uuid4().hex[:12]}', design=design, is_active=True)
    db.add(template)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'A template with this name already exists') from None
    db.refresh(template)
    return template


@router.patch('/templates/image/{template_id}', response_model=TemplateResponse)
def update_image_template(template_id: int, body: ImageTemplateUpdate, db: Session = Depends(get_db),
                          user: User = Depends(require_approved_company_admin)):
    template = db.scalar(select(CardTemplate).where(CardTemplate.id == template_id, CardTemplate.company_id == user.company_id))
    if template is None or not template.design or template.design.get('kind') != 'image':
        raise HTTPException(404, 'Template not found')
    if body.name and body.name != template.name:
        if db.scalar(select(CardTemplate).where(CardTemplate.name == body.name)):
            raise HTTPException(409, 'A template with this name already exists')
        template.name = body.name
    if body.description is not None:
        template.description = body.description
    if body.fields is not None:
        if not any(f.role == 'name' for f in body.fields):
            raise HTTPException(422, 'Mark where the employee name goes before saving')
        template.design = {**template.design, 'fields': [f.model_dump() for f in body.fields]}
    if body.back is not None:
        if body.back.style == 'image':
            _check_assets(user.company_id, body.back.source, body.back.background)
        template.design = {**template.design, 'back': body.back.model_dump()}
    if body.back_fields is not None and (template.design.get('back') or {}).get('style', 'image') == 'image' and template.design.get('back'):
        template.design = {**template.design, 'back': {**template.design['back'], 'fields': [f.model_dump() for f in body.back_fields]}}
    db.commit()
    db.refresh(template)
    return template


@router.get('/templates/image/assets/{company_id}/{file_name}')
def template_asset(company_id: int, file_name: str, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    """Background/source images, visible to the company, its approved members and platform admins."""
    allowed = user.role == SYSTEM_ADMIN or (user.role == COMPANY_ADMIN and user.company_id == company_id)
    if not allowed and user.role == EMPLOYEE:
        allowed = db.scalar(select(Membership.id).where(Membership.user_id == user.id, Membership.company_id == company_id,
                                                        Membership.status == 'APPROVED')) is not None
    if not allowed:
        raise HTTPException(404, 'Not found')
    try:
        path = resolve_asset(company_id, file_name)
    except ValueError:
        raise HTTPException(404, 'Not found') from None
    if not path.is_file():
        raise HTTPException(404, 'Not found')
    return FileResponse(path, media_type='image/png', headers={'Cache-Control': 'private, max-age=3600'})
