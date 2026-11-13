"""Synthetic business-card designs used to test the template ML pipeline.

They copy common layouts seen on popular template sites (photo left with name
and contact rows; dark card with title above a two-line uppercase name;
company card with right-aligned contact rows), drawn from scratch with Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1050, 600  # 3.5 x 2 in at 300 dpi


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ['arialbd.ttf', 'Arial Bold.ttf', 'DejaVuSans-Bold.ttf'] if bold else ['arial.ttf', 'Arial.ttf', 'DejaVuSans.ttf']
    for name in names:
        for folder in ('C:/Windows/Fonts', '/usr/share/fonts/truetype/dejavu', '/Library/Fonts'):
            path = Path(folder) / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def _face(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, ring: tuple | None = None) -> None:
    """A simple portrait: grey backdrop, shoulders, skin-tone face, dark hair."""
    if ring:
        draw.ellipse((cx - r - 10, cy - r - 10, cx + r + 10, cy + r + 10), fill=ring)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(205, 208, 214))
    draw.pieslice((cx - r * 0.8, cy + r * 0.35, cx + r * 0.8, cy + r * 1.9), 180, 360, fill=(40, 52, 80))
    draw.ellipse((cx - r * 0.36, cy - r * 0.48, cx + r * 0.36, cy + r * 0.4), fill=(214, 168, 135))
    draw.chord((cx - r * 0.4, cy - r * 0.62, cx + r * 0.4, cy - r * 0.05), 180, 360, fill=(45, 35, 30))
    for dx in (-0.14, 0.14):
        draw.ellipse((cx + r * dx - 5, cy - r * 0.12 - 4, cx + r * dx + 5, cy - r * 0.12 + 4), fill=(40, 30, 30))


def _icon(draw: ImageDraw.ImageDraw, x: int, y: int, color: tuple) -> None:
    draw.ellipse((x, y, x + 30, y + 30), fill=color)


def layout_photo_left(path: Path) -> Path:
    img = Image.new('RGB', (W, H), (198, 226, 248))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 0), (90, 0), (520, H), (0, H)], fill=(76, 137, 196))
    _face(d, 215, 300, 150)
    d.text((540, 95), 'Kyrie Petrakis', font=_font(64, True), fill=(52, 92, 140))
    d.text((542, 175), 'Communications Manager', font=_font(30), fill=(52, 92, 140))
    rows = ['+123-456-7890', 'hello@reallygreatsite.com', '123 Anywhere St., Any City']
    for i, text in enumerate(rows):
        _icon(d, 540, 268 + i * 72, (76, 137, 196))
        d.text((590, 268 + i * 72), text, font=_font(30), fill=(20, 20, 20))
    img.save(path)
    return path


def layout_dark_title_above(path: Path) -> Path:
    img = Image.new('RGB', (W, H), (14, 24, 52))
    d = ImageDraw.Draw(img)
    d.text((80, 110), 'Marketing Manager', font=_font(32, True), fill=(80, 160, 230))
    d.text((80, 160), 'SEBASTIAN', font=_font(70, True), fill=(255, 255, 255))
    d.text((80, 240), 'BENNETT', font=_font(70, True), fill=(255, 255, 255))
    rows = ['+123-456-7890', 'hello@reallygreatsite.com', 'www.reallygreatsite.com']
    for i, text in enumerate(rows):
        _icon(d, 80, 365 + i * 62, (80, 160, 230))
        d.text((125, 366 + i * 62), text, font=_font(28), fill=(225, 230, 240))
    _face(d, 800, 300, 165, ring=(40, 110, 200))
    img.save(path)
    return path


def layout_company_right_aligned(path: Path) -> Path:
    img = Image.new('RGB', (W, H), (10, 10, 12))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 200), fill=(0, 140, 230))
    d.text((80, 130), 'Wardiere Inc.', font=_font(36, True), fill=(255, 255, 255))
    rows = ['+123-456-7890', 'hello@reallygreatsite.com', 'www.reallygreatsite.com']
    font = _font(30)
    for i, text in enumerate(rows):
        width = d.textlength(text, font=font)
        d.text((640 - width, 300 + i * 64), text, font=font, fill=(240, 240, 240))
        _icon(d, 655, 300 + i * 64, (0, 140, 230))
    _face(d, 860, 400, 140)
    img.save(path)
    return path


def layout_back(path: Path) -> Path:
    """Typical card back: brand colour, centred logo mark, company name, slogan, website."""
    img = Image.new('RGB', (W, H), (16, 24, 69))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((470, 120, 580, 230), radius=22, fill=(50, 103, 176))
    d.polygon([(500, 200), (525, 145), (550, 200)], fill=(255, 255, 255))
    for text, size, bold, y, colour in (('Northwind Trading', 56, True, 265, (255, 255, 255)),
                                        ('Quality you can trust', 28, False, 345, (160, 190, 235)),
                                        ('www.northwind-trading.com', 26, False, 500, (200, 210, 230))):
        font = _font(size, bold)
        width = d.textlength(text, font=font)
        d.text(((W - width) / 2, y), text, font=font, fill=colour)
    img.save(path)
    return path


ALL_LAYOUTS = {
    'photo_left': layout_photo_left,
    'dark_title_above': layout_dark_title_above,
    'company_right_aligned': layout_company_right_aligned,
}
