from pathlib import Path
from reportlab.lib.colors import HexColor, white
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


def render_card_pdf(path: Path, company_name: str, employee, style_key: str):
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
    fit_text(canvas, employee.name, 'Helvetica-Bold', 17, 195)
    canvas.drawString(30, 99, employee.name)
    fit_text(canvas, employee.designation, 'Helvetica', 10, 195)
    canvas.drawString(30, 82, employee.designation)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(30, 66, employee.department)
    canvas.drawString(30, 46, employee.email)
    canvas.drawString(30, 32, employee.phone)
    fit_text(canvas, company_name.upper(), 'Helvetica-Bold', 8, 195)
    canvas.drawRightString(232, 14, company_name.upper())
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
            render_card_pdf(path, request.company.name, employee, request.template.style_key)
            created_paths.append(path)
            card = GeneratedCard(
                request_item_id=item.id,
                company_id=request.company_id,
                employee_id=employee.id,
                file_path=str(path.resolve()),
                file_name=filename,
                file_size=path.stat().st_size,
            )
            db.add(card)
            cards.append(card)
        db.flush()
        return cards
    except Exception:
        for path in created_paths:
            path.unlink(missing_ok=True)
        raise
