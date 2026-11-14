"""Make a card as an Adobe Illustrator (.ai) file with one employee's details on it.

The template keeps the original .ai it was made from. For each employee this takes that file,
keeps the front (and back) artboard, blanks the sample text and drops the sample photo, and puts the
real details in: live text at the exact spot, size, colour and alignment of the template's fields,
the employee's photo, the company logo and the verification QR code. Everything else in the design
(logos, shapes, backgrounds) is left untouched and stays vector, so it prints sharp.

The result is an .ai-compatible PDF: Illustrator opens it and the text stays editable. Layers are
flattened and the new text uses Helvetica, the same as the PDF cards.
"""

from __future__ import annotations

import ctypes
import io
from pathlib import Path

from PIL import Image

from app.core.config import settings
from app.services import illustrator
from app.services.image_template_render import _photo_image, field_value, layout_text_field
from app.services.template_ml import DYNAMIC_ROLES

INK_PAD = 0.012          # how far past the sample text's box still counts as that text
PHOTO_MATCH = 0.55       # how much of the photo box a picture must overlap to be the sample photo
TEXT_OPERATORS = (b'Tj', b'TJ', b"'", b'"')


def _rgb(hex_color: str) -> tuple[int, int, int]:
    value = (hex_color or '#111111').lstrip('#')
    if len(value) != 6:
        return 17, 17, 17
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def _wide(text: str):
    data = text.encode('utf-16-le') + b'\x00\x00'
    return (ctypes.c_ushort * (len(data) // 2)).from_buffer_copy(data)


def _clip(obj, page_w: float, page_h: float):
    left, bottom, right, top = obj.get_bounds()
    return max(0.0, left), max(0.0, bottom), min(page_w, right), min(page_h, top)


def _overlap(box_a, box_b) -> float:
    """Share of box_b covered by box_a. Boxes are (left, bottom, right, top)."""
    width = min(box_a[2], box_b[2]) - max(box_a[0], box_b[0])
    height = min(box_a[3], box_b[3]) - max(box_a[1], box_b[1])
    area = max(0.0, (box_b[2] - box_b[0]) * (box_b[3] - box_b[1]))
    return (max(0.0, width) * max(0.0, height) / area) if area else 0.0


def _field_box(field: dict, page_w: float, page_h: float):
    """A template field's box in page coordinates (left, bottom, right, top)."""
    left, right = field['x'] * page_w, (field['x'] + field['w']) * page_w
    top, bottom = page_h - field['y'] * page_h, page_h - (field['y'] + field['h']) * page_h
    return left, bottom, right, top


def _sample_content_indexes(page, fields: list[dict], page_w: float, page_h: float) -> tuple[set[int], set[int]]:
    """Which text objects and pictures (counted in drawing order) are the sample text and the sample photo."""
    import pypdfium2.raw as raw

    ink_boxes = []
    photo_boxes = []
    for field in fields:
        role = field.get('role')
        if role in DYNAMIC_ROLES and field.get('ink'):
            x, y, w, h = field['ink']
            ink_boxes.append(_field_box({'x': x - INK_PAD, 'y': y - INK_PAD, 'w': w + 2 * INK_PAD, 'h': h + 2 * INK_PAD}, page_w, page_h))
        elif role == 'photo':
            photo_boxes.append(_field_box(field, page_w, page_h))
    texts: set[int] = set()
    for number, obj in enumerate(page.get_objects(filter=[raw.FPDF_PAGEOBJ_TEXT])):
        left, bottom, right, top = obj.get_bounds()
        centre = ((left + right) / 2, (bottom + top) / 2)
        if any(b[0] <= centre[0] <= b[2] and b[1] <= centre[1] <= b[3] for b in ink_boxes):
            texts.add(number)
    images: set[int] = set()
    for number, obj in enumerate(page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE])):
        visible = _clip(obj, page_w, page_h)
        if any(_overlap(visible, box) >= PHOTO_MATCH and _overlap(box, visible) >= PHOTO_MATCH for box in photo_boxes):
            images.add(number)
    return texts, images


def _is_image_do(operands, operator, xobjects) -> bool:
    if operator != b'Do' or not operands:
        return False
    target = xobjects.get(operands[0])
    return target is not None and target.get_object().get('/Subtype') == '/Image'


def _stream_counts(reader, page_index: int) -> tuple[int, int]:
    """How many text-showing operators and picture draws the page's content stream has."""
    from pypdf.generic import ContentStream

    page = reader.pages[page_index]
    stream = ContentStream(page.get_contents(), reader)
    xobjects = (page.get('/Resources') or {}).get('/XObject') or {}
    texts = sum(1 for _, operator in stream.operations if operator in TEXT_OPERATORS)
    images = sum(1 for operands, operator in stream.operations if _is_image_do(operands, operator, xobjects))
    return texts, images


def _edit_pages(content: bytes, edits: list[tuple[int, set[int], set[int]]]) -> bytes:
    """Copy the chosen pages, blanking the given text objects and dropping the given pictures.

    This edits the page's content stream directly. Asking pdfium to delete objects makes it rewrite the
    whole page, and that loses the colours of designs that use ICC or spot colours; here every other
    byte of the artwork stays exactly as Illustrator wrote it.
    """
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import ArrayObject, ByteStringObject, ContentStream

    reader = PdfReader(io.BytesIO(content))
    writer = PdfWriter()
    for page_index, text_numbers, image_numbers in edits:
        page = writer.add_page(reader.pages[page_index])
        stream = ContentStream(page.get_contents(), writer)
        xobjects = (page.get('/Resources') or {}).get('/XObject') or {}
        kept = []
        text_seen = image_seen = 0
        for operands, operator in stream.operations:
            if operator in TEXT_OPERATORS:
                if text_seen in text_numbers:
                    if operator == b'TJ':
                        operands = [ArrayObject()]
                    elif operator == b'"':
                        operands = [operands[0], operands[1], ByteStringObject(b'')]
                    else:
                        operands = [ByteStringObject(b'')]
                text_seen += 1
            elif _is_image_do(operands, operator, xobjects):
                drop = image_seen in image_numbers
                image_seen += 1
                if drop:
                    continue
            kept.append((operands, operator))
        stream.operations = kept
        page.replace_contents(stream)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


class _Writer:
    def __init__(self, document):
        self.document = document
        self.fonts: dict[str, object] = {}

    def font(self, name: str):
        import pypdfium2.raw as raw

        if name not in self.fonts:
            self.fonts[name] = raw.FPDFText_LoadStandardFont(self.document.raw, name.encode())
        return self.fonts[name]

    def text(self, page, font_name: str, size: float, color: str, line: str, x: float, y: float) -> None:
        import pypdfium2.raw as raw

        obj = raw.FPDFPageObj_CreateTextObj(self.document.raw, self.font(font_name), size)
        raw.FPDFText_SetText(obj, ctypes.cast(_wide(line), ctypes.POINTER(ctypes.c_ushort)))
        red, green, blue = _rgb(color)
        raw.FPDFPageObj_SetFillColor(obj, red, green, blue, 255)
        raw.FPDFPageObj_Transform(obj, 1, 0, 0, 1, x, y)
        raw.FPDFPage_InsertObject(page.raw, obj)

    def image(self, page, picture: Image.Image, x: float, y: float, width: float, height: float) -> None:
        import pypdfium2 as pdfium

        item = pdfium.PdfImage.new(self.document)
        item.set_bitmap(pdfium.PdfBitmap.from_pil(picture.convert('RGBA')))
        item.set_matrix(pdfium.PdfMatrix().scale(width, height).translate(x, y))
        page.insert_obj(item)

    def rectangle(self, page, x: float, y: float, width: float, height: float, color: tuple[int, int, int]) -> None:
        import pypdfium2.raw as raw

        obj = raw.FPDFPageObj_CreateNewRect(x, y, width, height)
        raw.FPDFPageObj_SetFillColor(obj, color[0], color[1], color[2], 255)
        raw.FPDFPath_SetDrawMode(obj, 1, 0)
        raw.FPDFPage_InsertObject(page.raw, obj)

    def close(self) -> None:
        import pypdfium2.raw as raw

        for font in self.fonts.values():
            raw.FPDFFont_Close(font)


def _draw_qr(writer: _Writer, page, value: str, x: float, y: float, size: float) -> None:
    """The QR code as vector squares on a white plate, like the PDF cards."""
    from reportlab.graphics.barcode import qrencoder

    code = qrencoder.QRCode(None, qrencoder.QRErrorCorrectLevel.M)
    code.addData(value)
    code.make()
    count = code.getModuleCount()
    cell = size / count
    writer.rectangle(page, x - 3, y - 3, size + 6, size + 6, (255, 255, 255))
    for row in range(count):
        column = 0
        while column < count:
            if code.isDark(row, column):
                start = column
                while column < count and code.isDark(row, column):
                    column += 1
                writer.rectangle(page, x + start * cell, y + size - (row + 1) * cell, (column - start) * cell, cell, (0, 0, 0))
            else:
                column += 1


def _draw_fields(writer: _Writer, page, fields: list[dict], company, employee, verification_token: str | None, page_w: float, page_h: float) -> None:
    for field in fields:
        role = field.get('role')
        if role == 'photo':
            x, w = field['x'] * page_w, field['w'] * page_w
            h = field['h'] * page_h
            y = page_h - field['y'] * page_h - h
            circle = field.get('shape') == 'circle'
            if circle:
                d = min(w, h)
                x, y, w, h = x + (w - d) / 2, y + (h - d) / 2, d, d
            scale = 600 / 72
            picture = _photo_image(getattr(employee, 'photo_path', None), employee.name, max(8, int(w * scale)), max(8, int(h * scale)), circle)
            writer.image(page, picture, x, y, w, h)
        elif role == 'logo':
            logo = getattr(company, 'logo_path', None)
            if logo and Path(logo).is_file():
                try:
                    picture = Image.open(logo).convert('RGBA')
                except Exception:
                    continue
                x, w = field['x'] * page_w, field['w'] * page_w
                h = field['h'] * page_h
                y = page_h - field['y'] * page_h - h
                ratio = min(w / picture.width, h / picture.height)
                draw_w, draw_h = picture.width * ratio, picture.height * ratio
                writer.image(page, picture, x + (w - draw_w) / 2, y + (h - draw_h) / 2, draw_w, draw_h)
        elif role == 'qr':
            if verification_token:
                size = min(field['w'] * page_w, field['h'] * page_h) - 6
                x = field['x'] * page_w + 3
                y = page_h - field['y'] * page_h - field['h'] * page_h + 3
                _draw_qr(writer, page, f"{settings.public_app_url.rstrip('/')}/verify/{verification_token}", x, y, size)
        elif role and role != 'other':
            text = field_value(role, company, employee)
            if text:
                font, size, placed = layout_text_field(field, text, page_w, page_h)
                for line, x, y in placed:
                    writer.text(page, font, size, field.get('color') or '#111111', line, x, y)


def render_ai_card(content: bytes, ai: dict, design: dict, company, employee, verification_token: str | None) -> bytes:
    """The .ai file for one employee. `ai` is the template's saved {file, front, back}; `design` its image design."""
    import pypdf
    import pypdfium2 as pdfium

    sides = [(ai['front'], design.get('fields') or [])]
    back = design.get('back')
    if ai.get('back') is not None and back and back.get('style', 'image') == 'image':
        sides.append((ai['back'], back.get('fields') or []))

    source = illustrator._open(content)
    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        edits = []
        for index, fields in sides:
            if not 0 <= index < len(source):
                raise illustrator.IllustratorError('The saved artboard no longer exists in the Illustrator file')
            page = source[index]
            page_w, page_h = page.get_size()
            texts, images = _sample_content_indexes(page, fields, page_w, page_h)
            # The content stream and pdfium must agree on what is what, or the wrong text would be blanked.
            counted = (sum(1 for _ in page.get_objects(filter=[pdfium.raw.FPDF_PAGEOBJ_TEXT])),
                       sum(1 for _ in page.get_objects(filter=[pdfium.raw.FPDF_PAGEOBJ_IMAGE])))
            if _stream_counts(reader, index) != counted:
                raise illustrator.IllustratorError('This artboard is built in a way that cannot be exported as an .ai card. Download the PDF card instead.')
            edits.append((index, texts, images))
    finally:
        source.close()

    output = pdfium.PdfDocument(_edit_pages(content, edits))
    writer = _Writer(output)
    try:
        for number, (_, fields) in enumerate(sides):
            page = output[number]
            page_w, page_h = page.get_size()
            _draw_fields(writer, page, fields, company, employee, verification_token, page_w, page_h)
            page.gen_content()
        buffer = io.BytesIO()
        output.save(buffer)
        return buffer.getvalue()
    finally:
        writer.close()
        output.close()
