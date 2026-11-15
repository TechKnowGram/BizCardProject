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

import functools
import re
import shutil
import threading
from uuid import uuid4

import anyio
from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, Response, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import require_template_author
from app.api.routes.image_templates import ANALYSIS_LIMITER, MAX_DESIGN_BYTES, _analyze_files, _remove_unsaved_uploads
from app.models import User
from app.schemas.image_template import (
    ArtboardInfo, ArtboardLayers, ArtboardList, ArtboardPieces, ComposeRequest, ComposeResult, IllustratorAnalysis, IllustratorAnalyzeRequest, IllustratorLayersRequest,
)
from app.services import illustrator, illustrator_layers, illustrator_pieces
from app.services.image_template_render import project_folder, template_folder

router = APIRouter(tags=['Illustrator templates'])

# pdfium (which reads the .ai files) is not safe to use from two threads at once; two requests that overlap, such
# as the front and the back being drawn together, make it fail with "Failed to load page". One at a time.
_PDFIUM = illustrator.PDFIUM_LOCK


def _one_at_a_time(function):
    @functools.wraps(function)
    def run(*args, **kwargs):
        import pypdfium2 as pdfium

        with _PDFIUM:
            try:
                return function(*args, **kwargs)
            except pdfium.PdfiumError:
                # Any other failure to draw the file is reported as a problem with the file, not a server error.
                raise illustrator.IllustratorError('This artboard could not be drawn. Re-save the file from Illustrator and upload it again.') from None
    return run


def _ai_path(company_id: int | None, upload_id: str):
    return project_folder(company_id, upload_id) / 'design.ai'


@_one_at_a_time
def _read_artboards(company_id: int, content: bytes, file_name: str) -> dict:
    """CPU-heavy: reads the file and draws a preview per artboard. Runs in a worker thread."""
    boards = illustrator.list_artboards(content)
    folder = template_folder(company_id)
    folder.mkdir(parents=True, exist_ok=True)
    _remove_unsaved_uploads(company_id)
    upload_id = uuid4().hex
    project = project_folder(company_id, upload_id)
    (project / 'previews').mkdir(parents=True, exist_ok=True)
    written: list = []
    try:
        infos = []
        for board in boards:
            jpeg = illustrator.render_artboard(content, board.index, illustrator.PREVIEW_LONG_SIDE, 'JPEG')
            preview = f'previews/artboard-{board.index}.jpg'
            (project / preview).write_bytes(jpeg)
            infos.append(ArtboardInfo(index=board.index, name=board.name, width_mm=board.width_mm,
                                      height_mm=board.height_mm, card_like=board.card_like, preview=preview))
        _ai_path(company_id, upload_id).write_bytes(content)
    except Exception:
        shutil.rmtree(project, ignore_errors=True)
        raise
    return ArtboardList(upload_id=upload_id, file_name=file_name, artboards=infos).model_dump()


@router.post('/templates/illustrator/artboards', response_model=ArtboardList)
async def read_artboards(file: UploadFile = File(..., description='An Adobe Illustrator (.ai) file'),
                         user: User = Depends(require_template_author)):
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


@_one_at_a_time
def _analyse_artboards(company_id: int, body: IllustratorAnalyzeRequest) -> dict:
    path = _ai_path(company_id, body.upload_id)
    if not path.is_file():
        raise HTTPException(404, 'The Illustrator upload expired; upload the file again')
    content = path.read_bytes()
    front = _analyse_one(company_id, content, body.front, 'front')
    back = _analyse_one(company_id, content, body.back, 'back') if body.back is not None else None
    return {'upload_id': body.upload_id, 'front_artboard': body.front, 'back_artboard': body.back, 'front': front, 'back': back}


@router.post('/templates/illustrator/analyze', response_model=IllustratorAnalysis)
async def analyse_artboards(body: IllustratorAnalyzeRequest, user: User = Depends(require_template_author)):
    if body.back is not None and body.back == body.front:
        raise HTTPException(422, 'Choose different artboards for the front and the back')
    try:
        return await anyio.to_thread.run_sync(_analyse_artboards, user.company_id, body, limiter=ANALYSIS_LIMITER)
    except illustrator.IllustratorError as exc:
        raise HTTPException(422, str(exc)) from None


_LAYER_CACHE: dict[tuple, dict] = {}
_LAYER_CACHE_SIZE = 24


@_one_at_a_time
def _read_layers(company_id: int, body: IllustratorLayersRequest) -> dict:
    path = _ai_path(company_id, body.upload_id)
    if not path.is_file():
        raise HTTPException(404, 'The Illustrator upload expired; upload the file again')
    key = (company_id, body.upload_id, body.artboard)
    if key in _LAYER_CACHE:
        return _LAYER_CACHE[key]
    layer_folder = project_folder(company_id, body.upload_id) / f'artboard-{body.artboard}'
    layer_folder.mkdir(parents=True, exist_ok=True)

    def save_thumbnail(jpeg: bytes, number: int) -> str:
        name = f'thumb-{number}.jpg'
        (layer_folder / name).write_bytes(jpeg)
        return f'artboard-{body.artboard}/{name}'

    report = illustrator_layers.read_layers(path.read_bytes(), body.artboard, save_thumbnail)
    result = {'artboard': report.artboard, 'layers': report.layers, 'tree': report.tree, 'images': report.images, 'texts': report.texts,
              'shapes': report.shapes, 'truncated': report.truncated}
    if len(_LAYER_CACHE) >= _LAYER_CACHE_SIZE:
        _LAYER_CACHE.pop(next(iter(_LAYER_CACHE)))
    _LAYER_CACHE[key] = result
    return result


@router.post('/templates/illustrator/layers', response_model=ArtboardLayers)
async def read_artboard_layers(body: IllustratorLayersRequest, user: User = Depends(require_template_author)):
    """The layers of one artboard, with its images, text and shapes listed by kind."""
    try:
        return await anyio.to_thread.run_sync(_read_layers, user.company_id, body, limiter=ANALYSIS_LIMITER)
    except illustrator.IllustratorError as exc:
        raise HTTPException(422, str(exc)) from None


_PIECE_CACHE: dict[tuple, dict] = {}


@_one_at_a_time
def _read_pieces(company_id: int | None, body: IllustratorLayersRequest) -> dict:
    path = _ai_path(company_id, body.upload_id)
    if not path.is_file():
        raise HTTPException(404, 'The Illustrator upload expired; upload the file again')
    key = (company_id, body.upload_id, body.artboard)
    if key in _PIECE_CACHE:
        return _PIECE_CACHE[key]
    layer_folder = project_folder(company_id, body.upload_id) / f'artboard-{body.artboard}'
    layer_folder.mkdir(parents=True, exist_ok=True)

    def save_piece(data: bytes, number: int, extension: str) -> str:
        name = f'layer-{number:03d}.{extension}'
        (layer_folder / name).write_bytes(data)
        return f'artboard-{body.artboard}/{name}'

    report = illustrator_pieces.read_pieces(path.read_bytes(), body.artboard, save_piece)
    result = {'artboard': report.artboard, 'pieces': report.pieces, 'truncated': report.truncated}
    if len(_PIECE_CACHE) >= 12:
        _PIECE_CACHE.pop(next(iter(_PIECE_CACHE)))
    _PIECE_CACHE[key] = result
    return result


@router.post('/templates/illustrator/pieces', response_model=ArtboardPieces)
async def read_artboard_pieces(body: IllustratorLayersRequest, user: User = Depends(require_template_author)):
    """Every top-level object of one artboard drawn by itself, so the editor can stack and hide them like Illustrator's layers."""
    try:
        return await anyio.to_thread.run_sync(_read_pieces, user.company_id, body, limiter=ANALYSIS_LIMITER)
    except illustrator.IllustratorError as exc:
        raise HTTPException(422, str(exc)) from None


@_one_at_a_time
def _compose(company_id: int | None, body: ComposeRequest) -> dict:
    path = _ai_path(company_id, body.upload_id)
    if not path.is_file():
        raise HTTPException(404, 'The Illustrator upload expired; upload the file again')
    folder = template_folder(company_id)
    stem = uuid4().hex

    def save_band(png: bytes, number: int) -> str:
        name = f'{stem}_band{number}.png'
        (folder / name).write_bytes(png)
        return name

    return illustrator_pieces.compose_bands(path.read_bytes(), body.artboard, set(body.hide), body.cuts, body.long_side, save_band)


@router.post('/templates/illustrator/compose', response_model=ComposeResult)
async def compose_artwork(body: ComposeRequest, user: User = Depends(require_template_author)):
    """The artwork as the file draws it, minus the objects that change per employee, split where added layers sit between objects."""
    try:
        return await anyio.to_thread.run_sync(_compose, user.company_id, body, limiter=ANALYSIS_LIMITER)
    except illustrator.IllustratorError as exc:
        raise HTTPException(422, str(exc)) from None


@router.delete('/templates/illustrator/session/{upload_id}', status_code=204)
def end_session(upload_id: str = Path(pattern=r'^[0-9a-f]{32}$'), discard: list[str] = Query(default=[], max_length=8),
                user: User = Depends(require_template_author)):
    """Work on an uploaded file is finished: delete the working copy of the .ai and every picture drawn from it
    (artboard previews, layer pictures, thumbnails). Saved templates keep their own files, which have other names."""
    folder = template_folder(user.company_id)
    shutil.rmtree(project_folder(user.company_id, upload_id), ignore_errors=True)
    # Pictures read from an upload that was never saved as a template (the analysis of a new upload), if asked for.
    for name in discard:
        if re.fullmatch(r'[0-9a-f]{32}_(source|background)\.png', name):
            (folder / name).unlink(missing_ok=True)
    for cache in (_LAYER_CACHE, _PIECE_CACHE):
        for key in [k for k in cache if k[1] == upload_id]:
            cache.pop(key, None)
    return Response(status_code=204)


_MEDIA = {'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}


@router.get('/templates/image/projects/{upload_id}/{file_path:path}')
def project_file(upload_id: str = Path(pattern=r'^[0-9a-f]{32}$'), file_path: str = Path(max_length=200),
                 user: User = Depends(require_template_author)):
    """A picture from the temporary folder of one project (an artboard preview, a layer, a thumbnail)."""
    folder = project_folder(user.company_id, upload_id).resolve()
    target = (folder / file_path).resolve()
    if folder not in target.parents or target.suffix.lower() not in _MEDIA or not target.is_file():
        raise HTTPException(404, 'Not found')
    return FileResponse(target, media_type=_MEDIA[target.suffix.lower()], headers={'Cache-Control': 'private, max-age=600', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'"})
