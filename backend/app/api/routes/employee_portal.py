from pathlib import Path
from types import SimpleNamespace
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload
from app.api.deps import require_roles
from app.db.session import get_db
from app.models import CardOrder, Company, CardRequest, CardRequestItem, CardTemplate, GeneratedCard, Membership, PersonalCard, PersonalTemplate, User
from app.models.constants import EMPLOYEE
from app.schemas.domain import CardCheckout, CheckoutResponse, GeneratedCardResponse
from app.services.activity import add_audit, add_notification, notify_system_admins
from app.services.card_generation import render_card_pdf, storage_root
from app.services.image_template_render import render_image_template, user_owner

router = APIRouter(prefix='/employee', tags=['Employee Portal'])
INDIVIDUAL_CARD_PRICE = 50


def approved_membership(db: Session, user: User, company_id: int) -> Membership:
    membership = db.scalar(select(Membership).where(Membership.user_id == user.id, Membership.company_id == company_id,
                                                     Membership.status == 'APPROVED').options(selectinload(Membership.employee)))
    if membership is None or membership.employee is None or not membership.employee.is_active:
        raise HTTPException(403, 'Approved active membership is required')
    company = db.get(Company, company_id)
    if company is None or company.status != 'APPROVED':
        raise HTTPException(403, 'This company is not active on BizCard right now')
    return membership


def card_photo_path(db: Session, employee, user_id=None) -> str | None:
    """The photo printed on a company card: the company's photo of the employee, else the member's own profile picture."""
    if employee is not None and employee.photo_path and Path(employee.photo_path).is_file():
        return employee.photo_path
    if user_id is None and employee is not None:
        user_id = db.scalar(select(Membership.user_id).where(Membership.employee_id == employee.id, Membership.status == 'APPROVED'))
    user = db.get(User, user_id) if user_id else None
    path = getattr(user, 'avatar_path', None)
    return path if path and Path(path).is_file() else None


@router.get('/companies/{company_id}/photo')
def my_company_card_photo(company_id: int, frame: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    from app.services.photo_crop import photo_response
    membership = approved_membership(db, user, company_id)
    return photo_response(card_photo_path(db, membership.employee, user.id), frame, 'No photo yet')


@router.get('/companies/{company_id}/logo')
def my_company_logo(company_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    approved_membership(db, user, company_id)
    company = db.get(Company, company_id)
    path = Path(company.logo_path or '')
    if not path.is_file():
        raise HTTPException(404, 'Company logo not found')
    return FileResponse(path, headers={'Cache-Control': 'private, max-age=3600'})


@router.get('/templates/{company_id}')
def employee_templates(company_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    approved_membership(db, user, company_id)
    return db.scalars(select(CardTemplate).where(CardTemplate.is_active.is_(True),
                      or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == company_id)).order_by(CardTemplate.id)).all()


def _company_order(db: Session, user: User, company_id: int, template_id: int | None, quantity: int) -> dict:
    """An employee's company card order. Same rule as company requests: a system admin approves it first
    (the card is generated then), the employee pays, and only then can the PDF be downloaded."""
    membership = approved_membership(db, user, company_id)
    if template_id is None:
        raise HTTPException(422, 'Choose one of your company designs')
    template = db.scalar(select(CardTemplate).where(CardTemplate.id == template_id, CardTemplate.is_active.is_(True),
                         or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == company_id)))
    if template is None:
        raise HTTPException(404, 'Active template not found')
    request = CardRequest(company_id=company_id, template_id=template.id, created_by_id=user.id, status='PENDING',
                          items=[CardRequestItem(employee_id=membership.employee_id)])
    db.add(request)
    db.flush()
    order = CardOrder(company_id=company_id, user_id=user.id, membership_id=membership.id, request_id=request.id,
                      quantity=quantity, unit_price=INDIVIDUAL_CARD_PRICE, total_amount=INDIVIDUAL_CARD_PRICE * quantity,
                      payer='INDIVIDUAL', status='PENDING_APPROVAL')
    db.add(order)
    db.flush()
    company = db.get(Company, company_id)
    notify_system_admins(db, 'CARD_REVIEW', f'{user.username} ({company.name}) ordered {quantity} card(s): request #{request.id}.')
    add_notification(db, user.id, 'ORDER_SUBMITTED', f'Order #{order.id} was sent for approval. You can pay once it is approved.')
    add_audit(db, 'EMPLOYEE_CARD_ORDER', 'card_order', order.id, user.id, company_id, f'{quantity} card(s); request {request.id}; awaiting approval')
    db.commit()
    return {'order_id': order.id, 'quantity': order.quantity, 'unit_price': order.unit_price, 'total_amount': order.total_amount,
            'payer': order.payer, 'payment_status': order.status, 'card_ids': []}


@router.post('/cards/{company_id}/{template_id}', response_model=CheckoutResponse, status_code=201)
def create_my_card(company_id: int, template_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    """One company card. Kept for older clients; it follows the same approval and payment rule as checkout."""
    return _company_order(db, user, company_id, template_id, 1)


@router.post('/checkout/company/{company_id}', response_model=CheckoutResponse, status_code=201)
def checkout_company_cards(company_id: int, body: CardCheckout, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    return _company_order(db, user, company_id, body.template_id, body.quantity)


@router.post('/checkout/personal', response_model=CheckoutResponse, status_code=201)
def checkout_personal_cards(body: CardCheckout, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    """A personal card order on a design the employee uploaded (read by machine learning).
    Nothing is generated yet: a system admin approves it first, then the employee pays."""
    if body.personal_template_id is None:
        raise HTTPException(422, 'Upload or choose your card design first')
    chosen = db.scalar(select(PersonalTemplate).where(PersonalTemplate.id == body.personal_template_id, PersonalTemplate.user_id == user.id))
    if chosen is None:
        raise HTTPException(404, 'Design not found')
    name = (body.name or user.username or '').strip()
    if not name:
        raise HTTPException(422, 'Enter your full name')
    details = {
        'name': name, 'designation': (body.designation or '').strip(), 'department': (body.department or '').strip(),
        'phone': (body.phone or '').strip(), 'personal_template_id': chosen.id, 'design_name': chosen.name,
        # A copy of the design, so the order prints as ordered even if the design is changed or deleted later.
        'design': chosen.design,
    }
    order = CardOrder(company_id=None, user_id=user.id, membership_id=None, quantity=body.quantity,
                      unit_price=INDIVIDUAL_CARD_PRICE, total_amount=INDIVIDUAL_CARD_PRICE * body.quantity,
                      payer='INDIVIDUAL', status='PENDING_APPROVAL', details=details)
    db.add(order)
    db.flush()
    notify_system_admins(db, 'PERSONAL_ORDER_REVIEW', f'{user.username} ordered {body.quantity} personal card(s): order #{order.id}.')
    add_notification(db, user.id, 'ORDER_SUBMITTED', f'Order #{order.id} was sent for approval. You can pay once it is approved.')
    add_audit(db, 'PERSONAL_CARD_ORDER', 'card_order', order.id, user.id, None, f'{body.quantity} card(s); awaiting approval')
    db.commit()
    return {'order_id': order.id, 'quantity': order.quantity, 'unit_price': order.unit_price, 'total_amount': order.total_amount,
            'payer': 'INDIVIDUAL', 'payment_status': order.status, 'card_ids': []}


def render_personal_order(db: Session, order: CardOrder) -> list[int]:
    """Generate the PDFs of an approved personal order (one per card ordered). Called by the system admin's approval."""
    details = order.details or {}
    user = db.get(User, order.user_id)
    design = details.get('design')
    # An uploaded personal design has no company: its company boxes stay empty, as in the preview.
    company = SimpleNamespace(name='' if design else 'Personal Card', logo_path=None, website=None, address=None)
    # The profile photo goes into the photo frame of the design.
    employee = SimpleNamespace(name=details.get('name') or user.username, designation=details.get('designation') or '',
                               department=details.get('department') or '', email=user.email, phone=details.get('phone') or '',
                               photo_path=getattr(user, 'avatar_path', None))
    directory = storage_root() / 'personal' / str(user.id) / f'order_{order.id}'
    directory.mkdir(parents=True, exist_ok=True)
    ids, paths = [], []
    try:
        for number in range(1, order.quantity + 1):
            path = directory / f'personal-card-{number}.pdf'
            token = f'personal-{order.id}-{number}'
            if design:
                render_image_template(path, company, employee, token, design, user_owner(user.id))
            else:
                render_card_pdf(path, company, employee, 'classic', token)
            paths.append(path)
            card = PersonalCard(user_id=user.id, order_id=order.id, file_path=str(path.resolve()), file_name=path.name)
            db.add(card)
            db.flush()
            ids.append(card.id)
    except Exception:
        for path in paths:
            path.unlink(missing_ok=True)
        raise
    return ids


@router.get('/personal-cards')
def my_personal_cards(db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    cards = db.scalars(select(PersonalCard).where(PersonalCard.user_id == user.id).order_by(PersonalCard.id.desc())).all()
    results = []
    for card in cards:
        order = db.get(CardOrder, card.order_id)
        card_path = Path(card.file_path) if card.file_path else None
        file_size = card_path.stat().st_size if (card_path and card_path.is_file()) else 0
        order_status = order.status if order else 'PAID'
        results.append({
            'id': card.id,
            'user_id': str(card.user_id),
            'order_id': card.order_id,
            'file_name': card.file_name,
            'file_size': file_size,
            'status': 'ACTIVE' if order_status == 'PAID' else 'PENDING_PAYMENT',
            'payment_status': order_status,
            'created_at': card.created_at,
        })
    return results


@router.get('/orders')
def my_orders(db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    orders = db.scalars(select(CardOrder).where(CardOrder.user_id == user.id).options(selectinload(CardOrder.request))
                        .order_by(CardOrder.id.desc())).all()

    def reason(order: CardOrder) -> str | None:
        if order.status != 'REJECTED':
            return None
        return (order.details or {}).get('rejection_reason') or (order.request.rejection_reason if order.request else None)

    return [{'id': order.id, 'company_id': order.company_id, 'quantity': order.quantity, 'unit_price': order.unit_price,
             'total_amount': order.total_amount, 'payer': order.payer, 'status': order.status,
             'design_name': (order.details or {}).get('design_name') or (order.request.template.name if order.request and order.request.template else None),
             'rejection_reason': reason(order), 'created_at': order.created_at} for order in orders]


@router.get('/personal-cards/{card_id}/download')
def download_personal_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    card = db.scalar(select(PersonalCard).where(PersonalCard.id == card_id, PersonalCard.user_id == user.id))
    if card is None or not Path(card.file_path).is_file():
        raise HTTPException(404, 'Card not found')
    order = db.get(CardOrder, card.order_id)
    if order and order.status != 'PAID':
        raise HTTPException(status_code=402, detail=f'Payment required: Order #{order.id} is unpaid. Please complete payment to download.')
    return FileResponse(card.file_path, media_type='application/pdf', filename=card.file_name)


@router.get('/cards', response_model=list[GeneratedCardResponse])
def my_cards(db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    cards = db.scalars(
        select(GeneratedCard)
        .join(CardRequestItem)
        .join(CardRequest)
        .join(Membership, Membership.employee_id == GeneratedCard.employee_id)
        .where(Membership.user_id == user.id, Membership.status == 'APPROVED')
        .options(selectinload(GeneratedCard.item))
        .order_by(GeneratedCard.id.desc())
    ).all()
    results = []
    for card in cards:
        order = None
        if card.item and card.item.request_id:
            order = db.scalar(select(CardOrder).where(CardOrder.request_id == card.item.request_id).order_by(CardOrder.id.desc()))
        resp = GeneratedCardResponse.model_validate(card)
        order_status = order.status if order else 'PAID'
        resp.payment_status = order_status
        resp.order_id = order.id if order else None
        if order_status != 'PAID':
            resp.status = 'PENDING_PAYMENT'
        results.append(resp)
    return results


@router.get('/cards/{card_id}/download')
def download_my_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    card = db.scalar(
        select(GeneratedCard)
        .join(Membership, Membership.employee_id == GeneratedCard.employee_id)
        .where(GeneratedCard.id == card_id, Membership.user_id == user.id, Membership.status == 'APPROVED')
        .options(selectinload(GeneratedCard.item))
    )
    if card is None:
        raise HTTPException(404, 'Card not found')
    if card.item and card.item.request_id:
        order = db.scalar(select(CardOrder).where(CardOrder.request_id == card.item.request_id).order_by(CardOrder.id.desc()))
        if order and order.status != 'PAID':
            raise HTTPException(status_code=402, detail=f'Payment required: Order #{order.id} is awaiting payment. Please pay before downloading.')
    path = Path(card.file_path)
    if not path.is_file():
        raise HTTPException(404, 'Generated PDF is missing')
    return FileResponse(path, media_type='application/pdf', filename=card.file_name)
