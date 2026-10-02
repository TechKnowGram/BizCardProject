from pathlib import Path
from secrets import token_urlsafe
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models import CardRequest, GeneratedCard

CARD_WIDTH = 252
CARD_HEIGHT = 144

STYLES = {
    'classic': {'background': '#FFFFFF', 'accent': '#17324D', 'text': '#17324D'},
    'modern': {'background': '#18233F', 'accent': '#6D7CFF', 'text': '#FFFFFF'},
    'minimal': {'background': '#F7F5F0', 'accent': '#151515', 'text': '#151515'},
}


def storage_root() -> Path:
    configured = Path(settings.generated_card_storage)
    if configured.is_absolute():
        return configured
    return Path(__file__).resolve().parents[2] / configured


def fit_text(canvas: Canvas, text: str, font: str, size: int, max_width: float):
    while size > 7 and stringWidth(text, font, size) > max_width:
        size -= 1
    canvas.setFont(font, size)
    return size


def draw_qr(canvas: Canvas, value: str, x: float, y: float, size: float = 43):
    canvas.saveState()
    canvas.setFillColor(white)
    canvas.roundRect(x - 3, y - 3, size + 6, size + 6, 2, fill=1, stroke=0)
    qr = QrCodeWidget(value)
    x1, y1, x2, y2 = qr.getBounds()
    scale = size / max(x2 - x1, y2 - y1)
    drawing = Drawing(size, size, transform=[scale, 0, 0, scale, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, canvas, x, y)
    canvas.restoreState()


def draw_image(canvas: Canvas, file_path: str | None, x: float, y: float, width: float, height: float):
    if not file_path or not Path(file_path).is_file():
        return False
    try:
        canvas.drawImage(ImageReader(file_path), x, y, width, height, preserveAspectRatio=True, anchor='c', mask='auto')
        return True
    except Exception:
        return False


def render_card_pdf(path: Path, company, employee, style_key: str, verification_token: str):
    style = STYLES.get(style_key, STYLES['classic'])
    canvas = Canvas(str(path), pagesize=(CARD_WIDTH, CARD_HEIGHT), pageCompression=1)
    canvas.setFillColor(HexColor(style['background']))
    canvas.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=1, stroke=0)
    canvas.setFillColor(HexColor(style['accent']))
    if style_key == 'modern':
        canvas.rect(0, 0, 12, CARD_HEIGHT, fill=1, stroke=0)
        canvas.circle(230, 122, 36, fill=1, stroke=0)
    elif style_key == 'classic':
        canvas.rect(0, CARD_HEIGHT - 9, CARD_WIDTH, 9, fill=1, stroke=0)
        canvas.line(18, 38, 234, 38)
    else:
        canvas.rect(18, 22, 3, 100, fill=1, stroke=0)

    text_color = white if style['text'] == '#FFFFFF' else HexColor(style['text'])
    canvas.setFillColor(text_color)
    has_photo = draw_image(canvas, employee.photo_path, 25, 86, 38, 38)
    text_x = 71 if has_photo else 30
    fit_text(canvas, employee.name, 'Helvetica-Bold', 17, 158 if has_photo else 195)
    canvas.drawString(text_x, 103 if has_photo else 99, employee.name)
    fit_text(canvas, employee.designation, 'Helvetica', 10, 158 if has_photo else 195)
    canvas.drawString(text_x, 86 if has_photo else 82, employee.designation)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(text_x, 70 if has_photo else 66, employee.department)
    fit_text(canvas, employee.email, 'Helvetica', 7, 150)
    canvas.drawString(30, 46, employee.email)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(30, 32, employee.phone)
    draw_qr(canvas, f"{settings.public_app_url.rstrip('/')}/verify/{verification_token}", 190, 42)
    canvas.setFont('Helvetica', 5)
    canvas.drawCentredString(211.5, 37, 'SCAN TO VERIFY')
    if not draw_image(canvas, company.logo_path, 194, 112, 38, 18):
        fit_text(canvas, company.name.upper(), 'Helvetica-Bold', 8, 195)
        canvas.drawRightString(232, 14, company.name.upper())
    else:
        canvas.setFont('Helvetica-Bold', 7)
        canvas.drawRightString(232, 14, company.name.upper())
    canvas.showPage()
    canvas.save()


def generate_cards(db: Session, request: CardRequest) -> list[GeneratedCard]:
    output_dir = storage_root() / f'company_{request.company_id}' / f'request_{request.id}'
    output_dir.mkdir(parents=True, exist_ok=True)
    cards = []
    created_paths = []
    try:
        for item in request.items:
            if item.generated_card:
                cards.append(item.generated_card)
                continue
            employee = item.employee
            filename = f'{employee.employee_id}_card.pdf'
            path = output_dir / filename
            verification_token = token_urlsafe(24)
            render_card_pdf(path, request.company, employee, request.template.style_key, verification_token)
            created_paths.append(path)
            card = GeneratedCard(
                request_item_id=item.id,
                company_id=request.company_id,
                employee_id=employee.id,
                file_path=str(path.resolve()),
                file_name=filename,
                file_size=path.stat().st_size,
                verification_token=verification_token,
                status='ACTIVE',
            )
            db.add(card)
            cards.append(card)
        db.flush()
        return cards
    except Exception:
        for path in created_paths:
            path.unlink(missing_ok=True)
        raise
