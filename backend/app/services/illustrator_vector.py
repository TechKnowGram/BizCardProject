"""Reading a card design straight from an Illustrator artboard, without guessing from pixels.

An .ai file keeps its text as text: every word with its exact position, font size, colour and
weight. So for an artboard that still has live text this module

1. reads those text objects and joins the word fragments back into lines,
2. works out which line is the name, title, phone, email and so on (the same rules the image
   pipeline uses, but on exact data), with the true font size and colour,
3. deletes those text objects from the artboard and draws it again, which gives a clean
   background identical to the original design (no smudged inpainting).

If the artboard has no live text (everything was converted to outlines) it returns None and
the caller falls back to reading the picture with OCR.
"""

from __future__ import annotations

import ctypes
import math
import re

import numpy as np

from app.services import illustrator
from app.services.template_ml import (
    DYNAMIC_ROLES, Analysis, Field, _align_columns, _align_of, _classify, _color_distance, _detect_photo,
    _group_lines, _suggest_qr,
)

MIN_TEXT_LINES = 3
MIN_FONT_PT = 2.0


def _text_of(raw, text_object, textpage) -> str:
    count = raw.FPDFTextObj_GetText(text_object, textpage, None, 0)
    if count <= 0:
        return ''
    buffer = (ctypes.c_ushort * count)()
    raw.FPDFTextObj_GetText(text_object, textpage, ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ushort)), count)
    return bytes(buffer).decode('utf-16-le', errors='ignore').rstrip('\x00')


def _read_text_objects(page, textpage) -> list[dict]:
    import pypdfium2.raw as raw

    items = []
    for obj in page.get_objects(filter=[raw.FPDF_PAGEOBJ_TEXT]):
        text = _text_of(raw, obj.raw, textpage.raw)
        if not text.strip():
            continue
        left, bottom, right, top = obj.get_bounds()
        matrix = obj.get_matrix()
        size_in = ctypes.c_float()
        raw.FPDFTextObj_GetFontSize(obj.raw, size_in)
        size = (size_in.value or 1.0) * math.hypot(matrix.a, matrix.b)
        if size < MIN_FONT_PT or right <= left or top <= bottom:
            continue
        red, green, blue, alpha = (ctypes.c_uint() for _ in range(4))
        raw.FPDFPageObj_GetFillColor(obj.raw, red, green, blue, alpha)
        font = raw.FPDFTextObj_GetFont(obj.raw)
        bold = raw.FPDFFont_GetWeight(font) >= 600
        items.append({'obj': obj, 'text': text, 'l': left, 'b': bottom, 'r': right, 't': top, 'size': size,
                      'color': f'#{red.value:02x}{green.value:02x}{blue.value:02x}', 'bold': bold})
    return items


def _join_lines(items: list[dict]) -> list[dict]:
    """Illustrator splits a line into one object per word or kerning run; put them back together."""
    # 1. Group objects that sit on the same row in the same style (a big capital and the small
    #    letters after it have different centres, so compare against the row, not the last piece).
    rows: list[list[dict]] = []
    for item in sorted(items, key=lambda i: -(i['t'] + i['b']) / 2):
        centre = (item['t'] + item['b']) / 2
        for row in rows:
            head = row[0]
            if (abs(head['size'] - item['size']) <= 0.06 * head['size']
                    and abs((head['t'] + head['b']) / 2 - centre) <= 0.45 * head['size']
                    and _color_distance(head['color'], item['color']) < 40):
                row.append(item)
                break
        else:
            rows.append([item])
    # 2. Within a row, read left to right and start a new line where there is a real gap.
    lines: list[dict] = []
    for row in rows:
        row.sort(key=lambda i: i['l'])
        current: dict | None = None
        for item in row:
            if current is not None and item['l'] - current['r'] <= 1.3 * current['size']:
                gap = item['l'] - current['r']
                glue = ' ' if gap > 0.25 * current['size'] and not current['text'].endswith(' ') and not item['text'].startswith(' ') else ''
                current['text'] += glue + item['text']
                current['l'], current['b'] = min(current['l'], item['l']), min(current['b'], item['b'])
                current['r'], current['t'] = max(current['r'], item['r']), max(current['t'], item['t'])
                current['objects'].append(item['obj'])
            else:
                if current is not None:
                    lines.append(current)
                current = {**item, 'objects': [item['obj']]}
        if current is not None:
            lines.append(current)
    for line in lines:
        line['text'] = re.sub(r'\s+', ' ', line['text']).strip()
    return [line for line in lines if line['text']]


def _find_photo(page, page_w: float, page_h: float):
    """The large picture on the card (the person), as (object, fraction box) or None."""
    import pypdfium2.raw as raw

    best = None
    for obj in page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE]):
        left, bottom, right, top = obj.get_bounds()
        # A placed picture can hang over the artboard edge; only the visible part counts.
        left, bottom, right, top = max(0.0, left), max(0.0, bottom), min(page_w, right), min(page_h, top)
        width, height = right - left, top - bottom
        if width <= 0 or height <= 0:
            continue
        area = (width * height) / (page_w * page_h)
        if not 0.06 <= area <= 0.65 or not 0.4 <= width / height <= 2.5:
            continue
        if best is None or area > best[0]:
            best = (area, obj, (left / page_w, (page_h - top) / page_h, width / page_w, height / page_h))
    return (best[1], best[2]) if best else None


def _bgr(image) -> np.ndarray:
    return np.array(image.convert('RGB'))[:, :, ::-1].copy()


def looks_garbled(text: str) -> bool:
    """Some files store text with a custom font encoding, and the PDF then gives control characters
    instead of letters. Those words cannot be read from the file; they have to be read from the picture."""
    if not text.strip():
        return False
    readable = sum(1 for c in text if c.isprintable() and not 0xE000 <= ord(c) <= 0xF8FF)
    return readable / len(text) < 0.6


def ocr_text_boxes(page, boxes: list[tuple[float, float, float, float]]) -> list[str]:
    """Read the words inside boxes (left, bottom, right, top, in points).

    The artboard is drawn once and OCR runs once over it; each box then takes the lines that sit inside
    it. The boxes come from the file, so they are exact even when the words themselves are not readable.
    """
    import cv2

    from app.services.template_ml import _ocr_engine

    page_w, page_h = page.get_size()
    scale = illustrator.ANALYSIS_LONG_SIDE / max(page_w, page_h)
    image = _bgr(page.render(scale=scale, fill_color=(255, 255, 255, 255), may_draw_forms=False).to_pil())
    engine = _ocr_engine()

    def lines_of(picture) -> list[tuple[float, float, float, float, str]]:
        result, _ = engine(picture)
        found = []
        for points, text, score in result or []:
            if float(score) < 0.4 or not str(text).strip():
                continue
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            found.append((min(xs), min(ys), max(xs), max(ys), str(text).strip()))
        return found

    lines = lines_of(image)
    dark: list | None = None
    texts = []
    for left, bottom, right, top in boxes:
        x0, x1 = left * scale, right * scale
        y0, y1 = (page_h - top) * scale, (page_h - bottom) * scale
        pad = 0.3 * (y1 - y0)

        def inside(entries):
            hit = [e for e in entries if x0 - pad <= (e[0] + e[2]) / 2 <= x1 + pad and y0 - pad <= (e[1] + e[3]) / 2 <= y1 + pad]
            return ' '.join(e[4] for e in sorted(hit, key=lambda e: (round(e[1] / max(1.0, y1 - y0)), e[0])))

        text = inside(lines)
        if not text:
            # light text on a dark shape: look at the picture the other way round, once
            if dark is None:
                dark = lines_of(cv2.bitwise_not(image))
            text = inside(dark)
        texts.append(text)
    return texts


def analyze_artboard(content: bytes, index: int, side: str = 'front') -> tuple[np.ndarray, np.ndarray, Analysis] | None:
    """Returns (the artboard as a picture, the same without the replaceable text, what was found), or None."""
    document = illustrator._open(content)
    try:
        page = document[index]
        page_w, page_h = page.get_size()
        scale = illustrator.ANALYSIS_LONG_SIDE / max(page_w, page_h)
        while page_w * page_h * scale * scale > illustrator.MAX_PIXELS:
            scale *= 0.9
        source = _bgr(page.render(scale=scale, fill_color=(255, 255, 255, 255), may_draw_forms=False).to_pil())
        h, w = source.shape[:2]

        textpage = page.get_textpage()
        lines = _join_lines(_read_text_objects(page, textpage))
        if len(lines) < MIN_TEXT_LINES:
            return None
        # Words the file stores in a custom encoding are read from the picture, line by line.
        unreadable = [line for line in lines if looks_garbled(line['text'])]
        if unreadable:
            for line, text in zip(unreadable, ocr_text_boxes(page, [(l['l'], l['b'], l['r'], l['t']) for l in unreadable])):
                line['text'] = text
            lines = [line for line in lines if line['text'].strip()]
            if len(lines) < MIN_TEXT_LINES:
                return None

        found = []
        for line in lines:
            box = (int(line['l'] * scale), int((page_h - line['t']) * scale),
                   max(1, int((line['r'] - line['l']) * scale)), max(1, int((line['t'] - line['b']) * scale)))
            found.append({'text': line['text'], 'box': box, 'score': 1.0, 'color': line['color'], 'bold': line['bold'],
                          'size_pt': line['size'], 'objects': line['objects']})
        found.sort(key=lambda entry: (entry['box'][1], entry['box'][0]))

        groups = _group_lines(found, source)
        _classify(groups, w, h)

        # The card keeps the artboard's own size and shape, whatever it is.
        result = Analysis(width=w, height=h, width_pt=round(float(page_w), 2), height_pt=round(float(page_h), 2))

        replaced: list = []
        for group in groups:
            gx, gy, gw, gh = group['box']
            first = group['items'][0]
            # The back is shared artwork: its text stays exactly as designed (mark a field in the editor to change that).
            role = 'other' if side == 'back' else (group['role'] or 'other')
            grow = 0.0 if role == 'other' else 0.12
            align = _align_of([item['box'] for item in group['items']], w)
            x = gx - (gw * grow if align == 'right' else gw * grow / 2 if align == 'center' else 0)
            result.fields.append(Field(
                role=role, x=max(0.0, x / w), y=gy / h, w=min(1.0, gw * (1 + grow) / w), h=gh / h,
                text=group['text'], size=round(first['size_pt'] / page_h, 4), color=group['color'], align=align,
                bold=group['bold'], confidence=1.0, lines=len(group['items']),
                ink=(gx / w, gy / h, gw / w, gh / h),
            ))
            if role in DYNAMIC_ROLES:
                for item in group['items']:
                    replaced.extend(item['objects'])
        _align_columns(result.fields, w)

        photo_object = None
        vector_photo = _find_photo(page, page_w, page_h)
        if vector_photo:
            photo_object, (px, py, pw, ph) = vector_photo
            square = abs((pw * w) / (ph * h) - 1) < 0.12
            result.fields.append(Field('photo', px, py, pw, ph, shape='circle' if square else 'rect', confidence=1.0))
        else:
            photo = _detect_photo(source, [entry['box'] for entry in found])
            if photo:
                result.fields.append(photo)
            else:
                result.warnings.append('No photo frame was found. Add one in the editor if the design has a photo.')
        if not any(f.role == 'name' for f in result.fields):
            result.warnings.append('No name field was found. Mark the name in the editor.')
        result.fields.append(_suggest_qr(source, result.fields))

        # The clean background: the very same artboard with the replaceable text taken out.
        if photo_object is not None:
            replaced.append(photo_object)
        for obj in replaced:
            page.remove_obj(obj)
        page.gen_content()
        clean = _bgr(page.render(scale=scale, fill_color=(255, 255, 255, 255), may_draw_forms=False).to_pil())

        if side == 'back':
            result.warnings = [m for m in result.warnings if 'name field' not in m and 'photo frame' not in m]
        return source, clean, result
    finally:
        document.close()
