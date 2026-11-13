"""Fill an uploaded card design (an "image template") with one employee's details.

The design dict looks like:
    {
      "kind": "image",
      "background": "<file name of the cleaned background>",
      "source": "<file name of the original upload>",
      "width": 1400, "height": 800,
      "fields": [ {"role": "name", "x": .52, "y": .17, "w": .46, "h": .11,
                   "size": .088, "color": "#385f8f", "align": "left", "bold": true,
                   "shape": "rect", "lines": 1}, ... ]
    }
Boxes are fractions of the card. Text is drawn as real vector text on top of the
background image so it stays sharp in print.
"""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas

from app.core.config import settings
from app.services.assets import upload_root

CARD_WIDTH, CARD_HEIGHT = 252, 144  # 3.5 x 2 in, points


def template_folder(company_id: int | None) -> Path:
    return upload_root() / 'templates' / (f'company_{company_id}' if company_id else 'shared')


def resolve_asset(company_id: int | None, file_name: str) -> Path:
    """Resolve a stored file name inside the company's template folder (never a client path)."""
    folder = template_folder(company_id).resolve()
    path = (folder / Path(file_name).name).resolve()
    if path.parent != folder:
        raise ValueError('Invalid template asset')
    return path


def field_value(role: str, company, employee) -> str:
    values = {
        'name': employee.name,
        'title': employee.designation,
        'department': employee.department,
        'phone': employee.phone,
        'email': employee.email,
        'website': getattr(company, 'website', None),
        'address': getattr(company, 'address', None),
        'company': getattr(company, 'name', None),
    }
    return (values.get(role) or '').strip()


def _wrap(text: str, font: str, size: float, width: float, max_lines: int) -> list[str]:
    words, lines, current = text.split(), [], ''
    for word in words:
        trial = f'{current} {word}'.strip()
        if stringWidth(trial, font, size) <= width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines - 1] + [' '.join(lines[max_lines - 1:])]
    return lines


def _draw_text_field(canvas: Canvas, field: dict, text: str) -> None:
    font = 'Helvetica-Bold' if field.get('bold') else 'Helvetica'
    box_x, box_w = field['x'] * CARD_WIDTH, field['w'] * CARD_WIDTH
    box_top = CARD_HEIGHT - field['y'] * CARD_HEIGHT
    box_h = field['h'] * CARD_HEIGHT
    size = max(4.0, float(field.get('size') or 0.05) * CARD_HEIGHT)
    max_lines = max(1, int(field.get('lines') or 1))
    if field['role'] in ('address',):
        max_lines = max(max_lines, 2)

    # Shrink until it fits in the allowed number of lines (never below 55%).
    min_size = size * 0.55
    lines = _wrap(text, font, size, box_w, max_lines)
    while size > min_size and (len(lines) > max_lines or any(stringWidth(l, font, size) > box_w for l in lines)):
        size -= 0.25
        lines = _wrap(text, font, size, box_w, max_lines)
    # Last resort for a single very long word: trim with an ellipsis.
    lines = [_ellipsis(l, font, size, box_w) for l in lines]

    leading = size * 1.18
    block_h = leading * (len(lines) - 1) + size
    # Vertically: keep the first baseline where the design had it, centred in the box when it was one line.
    baseline = box_top - (box_h - block_h) / 2 - size * 0.8 if max_lines == 1 else box_top - size * 0.82

    canvas.setFillColor(HexColor(field.get('color') or '#111111'))
    canvas.setFont(font, size)
    align = field.get('align') or 'left'
    for i, line in enumerate(lines):
        y = baseline - i * leading
        if align == 'right':
            canvas.drawRightString(box_x + box_w, y, line)
        elif align == 'center':
            canvas.drawCentredString(box_x + box_w / 2, y, line)
        else:
            canvas.drawString(box_x, y, line)


def _ellipsis(text: str, font: str, size: float, width: float) -> str:
    if stringWidth(text, font, size) <= width:
        return text
    while text and stringWidth(text + '…', font, size) > width:
        text = text[:-1]
    return text.rstrip() + '…'


def _photo_image(photo_path: str | None, name: str, box_w_px: int, box_h_px: int, circle: bool) -> Image.Image:
    """Crop the employee photo to the frame (portrait bias: keep the upper middle); initials if missing."""
    if photo_path and Path(photo_path).is_file():
        try:
            photo = ImageOps.exif_transpose(Image.open(photo_path)).convert('RGB')
            target = box_w_px / box_h_px
            w, h = photo.size
            if w / h > target:            # too wide: crop the sides
                new_w = int(h * target); left = (w - new_w) // 2
                photo = photo.crop((left, 0, left + new_w, h))
            else:                          # too tall: keep the top part where the face usually is
                new_h = int(w / target); top = int((h - new_h) * 0.25)
                photo = photo.crop((0, top, w, top + new_h))
            photo = photo.resize((box_w_px, box_h_px), Image.LANCZOS)
        except Exception:
            photo = None
    else:
        photo = None
    if photo is None:
        photo = Image.new('RGB', (box_w_px, box_h_px), (226, 232, 240))
        initials = ''.join(w[0] for w in name.split()[:2]).upper() or '?'
        draw = ImageDraw.Draw(photo)
        try:
            from PIL import ImageFont
            font = ImageFont.load_default(size=int(box_h_px * 0.32))
        except Exception:
            font = None
        draw.text((box_w_px / 2, box_h_px / 2), initials, fill=(100, 116, 139), anchor='mm', font=font)
    if circle:
        mask = Image.new('L', photo.size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0, photo.size[0] - 1, photo.size[1] - 1), fill=255)
        photo = photo.convert('RGBA')
        photo.putalpha(mask)
    return photo


def _draw_photo(canvas: Canvas, field: dict, employee) -> None:
    x, w = field['x'] * CARD_WIDTH, field['w'] * CARD_WIDTH
    h = field['h'] * CARD_HEIGHT
    y = CARD_HEIGHT - field['y'] * CARD_HEIGHT - h
    circle = field.get('shape') == 'circle'
    if circle:  # keep it round even if the box is not perfectly square
        d = min(w, h); x += (w - d) / 2; y += (h - d) / 2; w = h = d
    scale = 600 / 72  # render the photo at ~600 dpi
    image = _photo_image(getattr(employee, 'photo_path', None), employee.name, max(8, int(w * scale)), max(8, int(h * scale)), circle)
    buffer = io.BytesIO(); image.save(buffer, format='PNG'); buffer.seek(0)
    canvas.drawImage(ImageReader(buffer), x, y, w, h, mask='auto')


def _draw_logo(canvas: Canvas, field: dict, company) -> None:
    logo = getattr(company, 'logo_path', None)
    if not logo or not Path(logo).is_file():
        return
    x, w = field['x'] * CARD_WIDTH, field['w'] * CARD_WIDTH
    h = field['h'] * CARD_HEIGHT
    y = CARD_HEIGHT - field['y'] * CARD_HEIGHT - h
    try:
        canvas.drawImage(ImageReader(logo), x, y, w, h, preserveAspectRatio=True, anchor='c', mask='auto')
    except Exception:
        pass


def _draw_side(canvas: Canvas, side: dict, company, employee, verification_token: str, company_id: int | None) -> None:
    from app.services.card_generation import draw_qr  # avoid a circular import

    background = resolve_asset(company_id, side['background'])
    canvas.drawImage(ImageReader(str(background)), 0, 0, CARD_WIDTH, CARD_HEIGHT)
    for field in side.get('fields', []):
        role = field.get('role')
        if role == 'photo':
            _draw_photo(canvas, field, employee)
        elif role == 'logo':
            _draw_logo(canvas, field, company)
        elif role == 'qr':
            size = min(field['w'] * CARD_WIDTH, field['h'] * CARD_HEIGHT) - 6
            x = field['x'] * CARD_WIDTH + 3
            y = CARD_HEIGHT - field['y'] * CARD_HEIGHT - field['h'] * CARD_HEIGHT + 3
            draw_qr(canvas, f"{settings.public_app_url.rstrip('/')}/verify/{verification_token}", x, y, size)
        elif role and role != 'other':
            text = field_value(role, company, employee)
            if text:
                _draw_text_field(canvas, field, text)
    canvas.showPage()


def _draw_auto_back(canvas: Canvas, back: dict, company, verification_token: str) -> None:
    """Logo, company name and website centred on a solid colour, with an optional QR."""
    from app.services.card_generation import draw_qr, fit_text

    canvas.setFillColor(HexColor(back.get('color') or '#101845'))
    canvas.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=1, stroke=0)
    text_color = HexColor(back.get('text_color') or '#FFFFFF')
    show_qr = back.get('show_qr', True)
    centre_x = CARD_WIDTH / 2 if not show_qr else CARD_WIDTH * 0.40
    logo = getattr(company, 'logo_path', None)
    has_logo = bool(logo and Path(logo).is_file())
    if has_logo:
        try:
            canvas.drawImage(ImageReader(logo), centre_x - 28, 80, 56, 40, preserveAspectRatio=True, anchor='c', mask='auto')
        except Exception:
            has_logo = False
    canvas.setFillColor(text_color)
    name = (getattr(company, 'name', '') or '').strip()
    size = fit_text(canvas, name, 'Helvetica-Bold', 15, (CARD_WIDTH * 0.62) if show_qr else CARD_WIDTH - 40)
    canvas.drawCentredString(centre_x, 62 if has_logo else 76, name)
    website = (getattr(company, 'website', '') or '').strip()
    if website:
        website = website.removeprefix('https://').removeprefix('http://').rstrip('/')
        canvas.setFont('Helvetica', 7.5)
        canvas.drawCentredString(centre_x, 48 if has_logo else 60, website)
    if show_qr:
        draw_qr(canvas, f"{settings.public_app_url.rstrip('/')}/verify/{verification_token}", CARD_WIDTH - 70, CARD_HEIGHT / 2 - 25, 50)
        canvas.setFont('Helvetica', 5)
        canvas.drawCentredString(CARD_WIDTH - 45, CARD_HEIGHT / 2 - 34, 'SCAN TO VERIFY')
    canvas.showPage()


def render_image_template(path: Path, company, employee, verification_token: str, design: dict, company_id: int | None) -> None:
    """Page 1 is the front; page 2 is the back when the design has one."""
    canvas = Canvas(str(path), pagesize=(CARD_WIDTH, CARD_HEIGHT), pageCompression=1)
    _draw_side(canvas, design, company, employee, verification_token, company_id)
    back = design.get('back')
    if back and back.get('style') == 'auto':
        _draw_auto_back(canvas, back, company, verification_token)
    elif back:
        _draw_side(canvas, back, company, employee, verification_token, company_id)
    canvas.save()
