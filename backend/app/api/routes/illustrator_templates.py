"""Templates from an Adobe Illustrator (.ai) file.

Flow (all the file work happens here, in Python):
1. POST /templates/illustrator/artboards - upload the .ai; the artboards are found and a
   preview of each is drawn. The file is kept for a day so the next step can use it.
2. The company admin picks which artboard is the front and which (if any) is the back.
3. POST /templates/illustrator/analyze   - the chosen artboards are drawn at print size and
   read by the same ML pipeline as an uploaded image. The result is reviewed and saved
   through the normal POST /templates/image.
"""

from __future__ import annotations

from uuid import uuid4

import anyio
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import require_approved_company_admin
from app.api.routes.image_templates import ANALYSIS_LIMITER, MAX_DESIGN_BYTES, _analyze_files, _remove_unsaved_uploads
from app.models import User
from app.schemas.image_template import (
    ArtboardInfo, ArtboardLayers, ArtboardList, IllustratorAnalysis, IllustratorAnalyzeRequest, IllustratorLayersRequest,
)
from app.services import illustrator, illustrator_layers
from app.services.image_template_render import template_folder

router = APIRouter(tags=['Illustrator templates'])


def _ai_path(company_id: int, upload_id: str):
    return template_folder(company_id) / f'ai_{upload_id}.ai'


def _read_artboards(company_id: int, content: bytes, file_name: str) -> dict:
    """CPU-heavy: reads the file and draws a preview per artboard. Runs in a worker thread."""
    boards = illustrator.list_artboards(content)
    folder = template_folder(company_id)
    folder.mkdir(parents=True, exist_ok=True)
    _remove_unsaved_uploads(company_id)
    upload_id = uuid4().hex
    written: list = []
    try:
        infos = []
        for board in boards:
            jpeg = illustrator.render_artboard(content, board.index, illustrator.PREVIEW_LONG_SIDE, 'JPEG')
            preview = f'{upload_id}_ab{board.index}.jpg'
            (folder / preview).write_bytes(jpeg)
            written.append(folder / preview)
            infos.append(ArtboardInfo(index=board.index, name=board.name, width_mm=board.width_mm,
                                      height_mm=board.height_mm, card_like=board.card_like, preview=preview))
        path = _ai_path(company_id, upload_id)
        path.write_bytes(content)
        written.append(path)
    except Exception:
        for item in written:
            item.unlink(missing_ok=True)
        raise
    return ArtboardList(upload_id=upload_id, file_name=file_name, artboards=infos).model_dump()


@router.post('/templates/illustrator/artboards', response_model=ArtboardList)
async def read_artboards(file: UploadFile = File(..., description='An Adobe Illustrator (.ai) file'),
                         user: User = Depends(require_approved_company_admin)):
    name = (file.filename or 'design.ai').strip()
    if not name.lower().endswith('.ai'):
        raise HTTPException(415, 'Upload an Adobe Illustrator file (.ai)')
    content = await file.read(illustrator.MAX_AI_BYTES + 1)
    try:
        return await anyio.to_thread.run_sync(_read_artboards, user.company_id, content, name[:120], limiter=ANALYSIS_LIMITER)
    except illustrator.IllustratorError as exc:
        raise HTTPException(422, str(exc)) from None


def _analyse_one(company_id: int, content: bytes, index: int, side: str) -> dict:
    """Read one artboard. A file with live text is read exactly; otherwise the picture is read with OCR."""
    import cv2

    from app.services.illustrator_vector import analyze_artboard

    exact = analyze_artboard(content, index, side)
    if exact is None:
        png = illustrator.render_artboard(content, index, illustrator.ANALYSIS_LONG_SIDE)
        if len(png) > MAX_DESIGN_BYTES * 3:
            raise HTTPException(413, 'That artboard is too detailed; simplify or shrink it')
        result = _analyze_files(company_id, png, None, side)
        width_pt, height_pt = illustrator.artboard_size(content, index)
        return {**result, 'width_pt': round(width_pt, 2), 'height_pt': round(height_pt, 2)}
    source, clean, analysis = exact
    folder = template_folder(company_id)
    folder.mkdir(parents=True, exist_ok=True)
    stem = uuid4().hex
    source_name, background_name = f'{stem}_source.png', f'{stem}_background.png'
    try:
        cv2.imwrite(str(folder / source_name), source)
        cv2.imwrite(str(folder / background_name), clean)
    except Exception:
        for name in (source_name, background_name):
            (folder / name).unlink(missing_ok=True)
        raise
    return {'source': source_name, 'background': background_name, **analysis.to_dict()}


def _analyse_artboards(company_id: int, body: IllustratorAnalyzeRequest) -> dict:
    path = _ai_path(company_id, body.upload_id)
    if not path.is_file():
        raise HTTPException(404, 'The Illustrator upload expired; upload the file again')
    content = path.read_bytes()
    front = _analyse_one(company_id, content, body.front, 'front')
    back = _analyse_one(company_id, content, body.back, 'back') if body.back is not None else None
    return {'upload_id': body.upload_id, 'front_artboard': body.front, 'back_artboard': body.back, 'front': front, 'back': back}


@router.post('/templates/illustrator/analyze', response_model=IllustratorAnalysis)
async def analyse_artboards(body: IllustratorAnalyzeRequest, user: User = Depends(require_approved_company_admin)):
    if body.back is not None and body.back == body.front:
        raise HTTPException(422, 'Choose different artboards for the front and the back')
    try:
        return await anyio.to_thread.run_sync(_analyse_artboards, user.company_id, body, limiter=ANALYSIS_LIMITER)
    except illustrator.IllustratorError as exc:
        raise HTTPException(422, str(exc)) from None


_LAYER_CACHE: dict[tuple, dict] = {}
_LAYER_CACHE_SIZE = 24


def _read_layers(company_id: int, body: IllustratorLayersRequest) -> dict:
    path = _ai_path(company_id, body.upload_id)
    if not path.is_file():
        raise HTTPException(404, 'The Illustrator upload expired; upload the file again')
    key = (company_id, body.upload_id, body.artboard)
    if key in _LAYER_CACHE:
        return _LAYER_CACHE[key]
    folder = template_folder(company_id)

    def save_thumbnail(jpeg: bytes, number: int) -> str:
        name = f'{body.upload_id}_ab{body.artboard}_img{number}.jpg'
        (folder / name).write_bytes(jpeg)
        return name

    report = illustrator_layers.read_layers(path.read_bytes(), body.artboard, save_thumbnail)
    result = {'artboard': report.artboard, 'layers': report.layers, 'tree': report.tree, 'images': report.images, 'texts': report.texts,
              'shapes': report.shapes, 'truncated': report.truncated}
    if len(_LAYER_CACHE) >= _LAYER_CACHE_SIZE:
        _LAYER_CACHE.pop(next(iter(_LAYER_CACHE)))
    _LAYER_CACHE[key] = result
    return result


@router.post('/templates/illustrator/layers', response_model=ArtboardLayers)
async def read_artboard_layers(body: IllustratorLayersRequest, user: User = Depends(require_approved_company_admin)):
    """The layers of one artboard, with its images, text and shapes listed by kind."""
    try:
        return await anyio.to_thread.run_sync(_read_layers, user.company_id, body, limiter=ANALYSIS_LIMITER)
    except illustrator.IllustratorError as exc:
        raise HTTPException(422, str(exc)) from None
