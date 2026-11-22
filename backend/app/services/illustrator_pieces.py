"""The top-level objects of an Illustrator artboard, each drawn on its own.

Illustrator's Layers panel lists the objects of a file; this draws every one of them by itself
(a transparent picture trimmed to the object) so the editor can stack them again exactly as the
file does and show or hide any of them. Drawing is done by pdfium from the file's PDF copy, so
fonts, gradients and clipping look the same as in Illustrator.
"""

from __future__ import annotations

import ctypes
import math
from dataclasses import dataclass, field

from app.services import illustrator
from app.services.illustrator_layers import _hex, _text_of

MAX_PIECES = 250
PIECE_LONG_SIDE = 1400


@dataclass
class PieceReport:
    artboard: dict
    pieces: list[dict] = field(default_factory=list)
    truncated: bool = False


def _kind(raw, obj) -> str:
    return {raw.FPDF_PAGEOBJ_TEXT: 'text', raw.FPDF_PAGEOBJ_IMAGE: 'image', raw.FPDF_PAGEOBJ_PATH: 'path',
            raw.FPDF_PAGEOBJ_SHADING: 'path', raw.FPDF_PAGEOBJ_FORM: 'group'}.get(obj.type, 'path')


def _render_only(content: bytes, index: int, keep: set[int], scale: float):
    """Draw the artboard with only the top-level objects numbered in `keep`, on a transparent background."""
    document = illustrator._open(content)
    try:
        page = document[index]
        for number, obj in enumerate(list(page.get_objects(max_depth=0))):
            if number not in keep:
                page.remove_obj(obj)
        return page.render(scale=scale, fill_color=(255, 255, 255, 0), may_draw_forms=False).to_pil().convert('RGBA')
    finally:
        document.close()


def _font_name(raw, font) -> str | None:
    """The name of the font a text object uses, so the editor can ask the browser for the same one."""
    if not font:
        return None
    for getter in (raw.FPDFFont_GetBaseFontName, raw.FPDFFont_GetFamilyName):
        size = getter(font, None, 0)
        if size and size > 1:
            buffer = ctypes.create_string_buffer(size)
            getter(font, buffer, size)
            name = buffer.value.decode('utf-8', errors='ignore').strip()
            if name:
                return name.split('+')[-1]  # "ABCDEF+Montserrat-Bold" -> "Montserrat-Bold"
    return None


def read_pieces(content: bytes, index: int, save_piece) -> PieceReport:
    """Every top-level object of the artboard, in the form that suits it:

    * shapes (paths) become a small SVG, so they stay sharp at any zoom;
    * text stays text (its words, size, colour and font); there is no picture of it;
    * pictures, groups and anything an SVG cannot express are drawn as a transparent PNG.

    `save_piece(data, number, extension)` stores a file and returns the name it can be fetched by.
    """
    import io

    import pypdfium2.raw as raw

    from app.services.illustrator_layers import _box
    from app.services.illustrator_svg import path_to_svg

    document = illustrator._open(content)
    try:
        if not 0 <= index < len(document):
            raise illustrator.IllustratorError('That artboard does not exist')
        page = document[index]
        page_w, page_h = page.get_size()
        if page_w <= 0 or page_h <= 0:
            raise illustrator.IllustratorError('That artboard has no size')
        scale = PIECE_LONG_SIDE / max(page_w, page_h)
        while page_w * page_h * scale * scale > illustrator.MAX_PIXELS:
            scale *= 0.9
        report = PieceReport(artboard={'index': index, 'width_mm': round(page_w * 25.4 / 72, 1), 'height_mm': round(page_h * 25.4 / 72, 1)})
        textpage = page.get_textpage()
        objects = list(page.get_objects(max_depth=0))
        details: list[dict] = []
        for number, obj in enumerate(objects):
            kind = _kind(raw, obj)
            item = {'index': number, 'kind': kind, 'name': {'image': '<Image>', 'group': '<Group>'}.get(kind, '<Path>'), 'format': 'png'}
            if kind == 'text':
                # Text that cannot be decoded (outlined or custom fonts) is still drawn, just without readable content.
                text = _text_of(raw, obj.raw, textpage.raw).strip()
                size_in = ctypes.c_float()
                raw.FPDFTextObj_GetFontSize(obj.raw, size_in)
                matrix = obj.get_matrix()
                red, green, blue, _ = (ctypes.c_uint() for _ in range(4))
                raw.FPDFPageObj_GetFillColor(obj.raw, red, green, blue, ctypes.c_uint())
                font = raw.FPDFTextObj_GetFont(obj.raw)
                item.update(name=text or '<Text>', text=text or None, size_pt=round((size_in.value or 1.0) * math.hypot(matrix.a, matrix.b), 2),
                            color=_hex(red.value, green.value, blue.value), font=_font_name(raw, font))
                # Weight is not always filled in (the standard fonts); the font's own name says it too, as in "Montserrat-Black".
                item['bold'] = bool(raw.FPDFFont_GetWeight(font) >= 600 or any(w in (item.get('font') or '').lower() for w in ('bold', 'black', 'heavy')))
                box = _box(obj, page_w, page_h)
                if text and box:
                    item.update(format='text', x=box[0], y=box[1], w=box[2], h=box[3], file=None)
            elif kind == 'path':
                try:
                    drawn = path_to_svg(raw, obj, page_w, page_h)
                except Exception:  # a path this cannot read is drawn as a picture instead
                    drawn = None
                if drawn:
                    svg, (left, bottom, right, top) = drawn
                    item.update(format='svg', x=round(left / page_w, 5), y=round((page_h - top) / page_h, 5),
                                w=round((right - left) / page_w, 5), h=round((top - bottom) / page_h, 5), svg=svg)
            details.append(item)
    finally:
        document.close()

    if len(details) > MAX_PIECES:
        report.truncated = True
    singles, rest = details[:MAX_PIECES - 1] if report.truncated else details, details[MAX_PIECES - 1:] if report.truncated else []
    groups: list[tuple[dict, set[int]]] = [(item, {item['index']}) for item in singles]
    if rest:
        groups.append(({'index': rest[0]['index'], 'kind': 'group', 'name': f'{len(rest)} more objects', 'format': 'png'}, {r['index'] for r in rest}))

    for item, keep in groups:
        if item['format'] == 'text':
            report.pieces.append(item)
            continue
        if item['format'] == 'svg':
            item['file'] = save_piece(item.pop('svg').encode('utf-8'), item['index'], 'svg')
            report.pieces.append(item)
            continue
        image = _render_only(content, index, keep, scale)
        box = image.getchannel('A').getbbox()
        if box is None:  # lies outside the artboard
            item.update(x=0.0, y=0.0, w=0.0, h=0.0, file=None)
        else:
            left, top, right, bottom = box
            width, height = image.size
            buffer = io.BytesIO()
            image.crop(box).save(buffer, 'PNG', optimize=True)
            item.update(x=round(left / width, 5), y=round(top / height, 5), w=round((right - left) / width, 5),
                        h=round((bottom - top) / height, 5), file=save_piece(buffer.getvalue(), item['index'], 'png'))
        report.pieces.append(item)
    return report


def compose_bands(content: bytes, index: int, hide: set[int], cuts: list[int], long_side: int, save_band) -> dict:
    """Draw the artboard as stacked bands, leaving out the objects in `hide` (the ones that change per employee).

    The first band is the opaque background (everything below the lowest cut); each later band is a transparent
    picture of the objects from one cut up to the next. `save_band(png_bytes, number)` stores a picture and
    returns its name. Returns {'background': name, 'width', 'height', 'overlays': [{'file', 'z'}]}.
    """
    import io

    from PIL import Image

    document = illustrator._open(content)
    try:
        if not 0 <= index < len(document):
            raise illustrator.IllustratorError('That artboard does not exist')
        page = document[index]
        page_w, page_h = page.get_size()
        count = len(list(page.get_objects(max_depth=0)))
    finally:
        document.close()
    if page_w <= 0 or page_h <= 0:
        raise illustrator.IllustratorError('That artboard has no size')
    scale = long_side / max(page_w, page_h)
    while page_w * page_h * scale * scale > illustrator.MAX_PIXELS:
        scale *= 0.9

    edges = [0, *sorted({c for c in cuts if 0 < c < count}), count]
    result: dict = {'overlays': []}
    for number, (low, high) in enumerate(zip(edges, edges[1:])):
        keep = {i for i in range(low, high) if i not in hide}
        image = _render_only(content, index, keep, scale)
        if number == 0:
            base = Image.new('RGBA', image.size, (255, 255, 255, 255))
            base.alpha_composite(image)
            buffer = io.BytesIO()
            base.convert('RGB').save(buffer, 'PNG', optimize=True)
            result.update(background=save_band(buffer.getvalue(), number), width=image.size[0], height=image.size[1])
            continue
        box = image.getchannel('A').getbbox()
        name = ''
        if box is not None:
            buffer = io.BytesIO()
            image.save(buffer, 'PNG', optimize=True)
            name = save_band(buffer.getvalue(), number)
        result['overlays'].append({'file': name, 'z': low})
    return result
