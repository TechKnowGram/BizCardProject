"""Reading Adobe Illustrator (.ai) files: find the artboards and draw each one as an image.

Every modern .ai file carries a PDF-compatible copy of the artwork, and Illustrator writes
one PDF page per artboard. So the artboards are the pages: their size is the page size and
a preview is the page drawn on white. All of this runs here in Python; the browser only
shows the previews and sends back which artboard is the front and which is the back.

An .ai saved without "Create PDF Compatible File" (or an old PostScript-style one) has no
such copy; it is refused with a message that says how to re-save it.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

MAX_AI_BYTES = 50_000_000
MAX_ARTBOARDS = 30
PREVIEW_LONG_SIDE = 640
ANALYSIS_LONG_SIDE = 2100
MAX_PIXELS = 40_000_000
# A business card is 3.5 x 2 in. Anything within this much of that ratio is offered as a card.
CARD_RATIO = 3.5 / 2.0
RATIO_TOLERANCE = 0.18


class IllustratorError(ValueError):
    """The file cannot be used; the message is safe to show to the person who uploaded it."""


@dataclass
class Artboard:
    index: int
    name: str
    width_pt: float
    height_pt: float

    @property
    def width_mm(self) -> float:
        return round(self.width_pt * 25.4 / 72, 1)

    @property
    def height_mm(self) -> float:
        return round(self.height_pt * 25.4 / 72, 1)

    @property
    def card_like(self) -> bool:
        if self.width_pt <= 0 or self.height_pt <= 0:
            return False
        # A card is 1.75:1 lying down or standing up.
        ratio = max(self.width_pt, self.height_pt) / min(self.width_pt, self.height_pt)
        return abs(ratio - CARD_RATIO) / CARD_RATIO <= RATIO_TOLERANCE


def check_illustrator_file(content: bytes) -> None:
    if not content:
        raise IllustratorError('The file is empty')
    if len(content) > MAX_AI_BYTES:
        raise IllustratorError('The Illustrator file must be 50 MB or smaller')
    if b'%PDF-' not in content[:1024]:
        raise IllustratorError(
            'This Illustrator file has no PDF-compatible copy of the artwork. In Illustrator choose '
            'File > Save As, then tick "Create PDF Compatible File" and upload it again.'
        )


def _open(content: bytes):
    import pypdfium2 as pdfium

    try:
        return pdfium.PdfDocument(content)
    except pdfium.PdfiumError as exc:
        message = str(exc).lower()
        if 'password' in message:
            raise IllustratorError('This file is password protected. Remove the password and upload it again.') from None
        raise IllustratorError('The Illustrator file could not be read. Re-save it from Illustrator and try again.') from None


def list_artboards(content: bytes) -> list[Artboard]:
    check_illustrator_file(content)
    document = _open(content)
    try:
        count = len(document)
        if count == 0:
            raise IllustratorError('No artboards were found in this file')
        if count > MAX_ARTBOARDS:
            raise IllustratorError(f'This file has {count} artboards; the limit is {MAX_ARTBOARDS}')
        boards = []
        for index in range(count):
            page = document[index]
            width, height = page.get_size()  # points, already upright after any page rotation
            boards.append(Artboard(index, f'Artboard {index + 1}', float(width), float(height)))
            page.close()
        return boards
    finally:
        document.close()


def artboard_size(content: bytes, index: int) -> tuple[float, float]:
    """The artboard's real size in points."""
    document = _open(content)
    try:
        if not 0 <= index < len(document):
            raise IllustratorError('That artboard does not exist')
        page = document[index]
        width, height = page.get_size()
        page.close()
        return float(width), float(height)
    finally:
        document.close()


def render_artboard(content: bytes, index: int, long_side: int, fmt: str = 'PNG') -> bytes:
    """Draw one artboard on a white background, its longer side `long_side` pixels, as PNG or JPEG."""
    document = _open(content)
    try:
        if not 0 <= index < len(document):
            raise IllustratorError('That artboard does not exist')
        page = document[index]
        width, height = page.get_size()
        if width <= 0 or height <= 0:
            raise IllustratorError('That artboard has no size')
        scale = long_side / max(width, height)
        # Never draw more pixels than the image checks elsewhere accept.
        while width * height * scale * scale > MAX_PIXELS:
            scale *= 0.9
        bitmap = page.render(scale=scale, fill_color=(255, 255, 255, 255), may_draw_forms=False)
        image = bitmap.to_pil().convert('RGB')
        page.close()
        buffer = io.BytesIO()
        if fmt == 'JPEG':
            image.save(buffer, 'JPEG', quality=88, optimize=True)
        else:
            image.save(buffer, 'PNG')
        return buffer.getvalue()
    finally:
        document.close()
