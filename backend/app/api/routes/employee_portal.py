from pathlib import Path
from types import SimpleNamespace
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload
from app.api.deps import require_roles
from app.db.session import get_db
from app.models import CardOrder, Company, CardRequest, CardRequestItem, CardTemplate, GeneratedCard, Membership, PaymentRecord, PersonalCard, PersonalTemplate, User
from app.models.constants import EMPLOYEE
from app.schemas.domain import CardCheckout, CheckoutResponse, GeneratedCardResponse
from app.services.activity import add_audit, add_notification
from app.services.card_generation import generate_cards, render_card_pdf, storage_root
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


@router.post('/cards/{company_id}/{template_id}', response_model=GeneratedCardResponse, status_code=201)
def create_my_card(company_id: int, template_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    membership = approved_membership(db, user, company_id)
    template = db.scalar(select(CardTemplate).where(CardTemplate.id == template_id, CardTemplate.is_active.is_(True),
                         or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == company_id)))
    if template is None:
        raise HTTPException(404, 'Active template not found')
    # Same rule as checkout: the card is prepared now, but it can only be downloaded after the order is paid.
    order = CardOrder(company_id=company_id, user_id=user.id, membership_id=membership.id, quantity=1,
                      unit_price=INDIVIDUAL_CARD_PRICE, total_amount=INDIVIDUAL_CARD_PRICE,
                      payer='INDIVIDUAL', status='PENDING_PAYMENT')
    db.add(order); db.flush()
    request = CardRequest(company_id=company_id, template_id=template.id, created_by_id=user.id, status='PROCESSING',
                          items=[CardRequestItem(employee_id=membership.employee_id)])
    db.add(request); db.flush()
    order.request_id = request.id
    request = db.scalar(select(CardRequest).where(CardRequest.id == request.id).options(
        selectinload(CardRequest.company), selectinload(CardRequest.template),
        selectinload(CardRequest.items).selectinload(CardRequestItem.employee),
        selectinload(CardRequest.items).selectinload(CardRequestItem.generated_card)))
    try:
        card = generate_cards(db, request)[0]
        request.status = 'COMPLETED'
        add_notification(db, user.id, 'ORDER_CREATED', f'Your card is ready. Pay ৳{order.total_amount} for Order #{order.id} to download it.')
        add_audit(db, 'EMPLOYEE_CARD_CREATED', 'generated_card', card.id, user.id, company_id, f'{template.name}; order {order.id}')
        db.commit(); db.refresh(card)
        return card
    except Exception:
        db.rollback()
        raise HTTPException(500, 'Card generation failed') from None


@router.post('/checkout/company/{company_id}', response_model=CheckoutResponse, status_code=201)
def checkout_company_cards(company_id: int, body: CardCheckout, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    membership = approved_membership(db, user, company_id)
    if body.template_id is None:
        raise HTTPException(422, 'A template is required')
    template = db.scalar(select(CardTemplate).where(CardTemplate.id == body.template_id, CardTemplate.is_active.is_(True),
                         or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == company_id)))
    if template is None:
        raise HTTPException(404, 'Active template not found')

    unit_price = INDIVIDUAL_CARD_PRICE
    total_amount = unit_price * body.quantity
    status = 'PENDING_PAYMENT'

    order = CardOrder(company_id=company_id, user_id=user.id, membership_id=membership.id, quantity=body.quantity,
                      unit_price=unit_price, total_amount=total_amount, payer='INDIVIDUAL', status=status)
    db.add(order)
    db.flush()

    card_ids = []
    try:
        request = CardRequest(company_id=company_id, template_id=template.id, created_by_id=user.id, status='PROCESSING',
            items=[CardRequestItem(employee_id=membership.employee_id)])
        db.add(request)
        db.flush()
        order.request_id = request.id
        request = db.scalar(select(CardRequest).where(CardRequest.id == request.id).options(
            selectinload(CardRequest.company), selectinload(CardRequest.template),
            selectinload(CardRequest.items).selectinload(CardRequestItem.employee),
            selectinload(CardRequest.items).selectinload(CardRequestItem.generated_card)
        ))
        card = generate_cards(db, request)[0]
        request.status = 'COMPLETED'
        card_ids.append(card.id)
        add_audit(db, 'EMPLOYEE_CARD_ORDER', 'card_order', order.id, user.id, company_id, f'{body.quantity} cards; INDIVIDUAL')
        db.commit()
        return {'order_id': order.id, 'quantity': order.quantity, 'unit_price': unit_price,
                'total_amount': order.total_amount, 'payer': order.payer, 'payment_status': status, 'card_ids': card_ids}
    except Exception:
        db.rollback()
        raise HTTPException(500, 'Card generation failed') from None


@router.post('/checkout/personal', response_model=CheckoutResponse, status_code=201)
def checkout_personal_cards(body: CardCheckout, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    design = None
    if body.personal_template_id is not None:
        chosen = db.scalar(select(PersonalTemplate).where(PersonalTemplate.id == body.personal_template_id, PersonalTemplate.user_id == user.id))
        if chosen is None:
            raise HTTPException(404, 'Design not found')
        design = chosen.design
    unit_price = INDIVIDUAL_CARD_PRICE
    total_amount = unit_price * body.quantity
    order = CardOrder(company_id=None, user_id=user.id, membership_id=None, quantity=body.quantity,
                      unit_price=unit_price, total_amount=total_amount, payer='INDIVIDUAL', status='PENDING_PAYMENT')
    db.add(order)
    db.flush()
    # An uploaded personal design has no company: leave its company boxes empty, as in the preview.
    company = SimpleNamespace(name='' if design is not None else 'Personal Card', logo_path=None, website=None, address=None)
    # The profile photo goes into the photo frame of an uploaded design.
    employee = SimpleNamespace(name=body.name or user.username, designation=body.designation or 'Professional',
        department=body.department or 'Independent', email=user.email, phone=body.phone or 'Not provided',
        photo_path=getattr(user, 'avatar_path', None))
    directory = storage_root() / 'personal' / str(user.id) / f'order_{order.id}'; directory.mkdir(parents=True, exist_ok=True)
    cards = []
    try:
        for number in range(1, body.quantity + 1):
            path = directory / f'personal-card-{number}.pdf'
            token = f'personal-{order.id}-{number}'
            if design is not None:
                render_image_template(path, company, employee, token, design, user_owner(user.id))
            else:
                render_card_pdf(path, company, employee, 'classic', token)
            card = PersonalCard(user_id=user.id, order_id=order.id, file_path=str(path.resolve()), file_name=path.name)
            db.add(card); db.flush(); cards.append(card.id)
        add_audit(db, 'PERSONAL_CARD_ORDER', 'card_order', order.id, user.id, None, f'{body.quantity} cards')
        db.commit()
        return {'order_id': order.id, 'quantity': order.quantity, 'unit_price': unit_price,
                'total_amount': order.total_amount, 'payer': 'INDIVIDUAL', 'payment_status': 'PENDING_PAYMENT', 'card_ids': cards}
    except Exception:
        db.rollback()
        raise HTTPException(500, 'Personal card generation failed') from None


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
    orders = db.scalars(select(CardOrder).where(CardOrder.user_id == user.id).order_by(CardOrder.id.desc())).all()
    return [{'id': order.id, 'company_id': order.company_id, 'quantity': order.quantity, 'unit_price': order.unit_price,
             'total_amount': order.total_amount, 'payer': order.payer, 'status': order.status,
             'created_at': order.created_at} for order in orders]


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
