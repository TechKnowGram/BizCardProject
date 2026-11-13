from pathlib import Path
from types import SimpleNamespace
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload
from app.api.deps import require_roles
from app.db.session import get_db
from app.models import CardOrder, Company, CardRequest, CardRequestItem, CardTemplate, GeneratedCard, Membership, PaymentRecord, PersonalCard, User
from app.models.constants import EMPLOYEE
from app.schemas.domain import CardCheckout, CheckoutResponse, GeneratedCardResponse
from app.services.activity import add_audit, add_notification
from app.services.card_generation import generate_cards, render_card_pdf, storage_root

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
    order = CardOrder(company_id=company_id, user_id=user.id, membership_id=membership.id, quantity=1,
                      unit_price=INDIVIDUAL_CARD_PRICE, total_amount=INDIVIDUAL_CARD_PRICE,
                      payer='INDIVIDUAL', status='PAID')
    db.add(order); db.flush()
    db.add(PaymentRecord(order_id=order.id, amount=order.total_amount))
    request = CardRequest(company_id=company_id, template_id=template.id, created_by_id=user.id, status='PROCESSING',
                          items=[CardRequestItem(employee_id=membership.employee_id)])
    db.add(request); db.flush()
    request = db.scalar(select(CardRequest).where(CardRequest.id == request.id).options(
        selectinload(CardRequest.company), selectinload(CardRequest.template),
        selectinload(CardRequest.items).selectinload(CardRequestItem.employee),
        selectinload(CardRequest.items).selectinload(CardRequestItem.generated_card)))
    try:
        card = generate_cards(db, request)[0]
        request.status = 'COMPLETED'
        add_notification(db, user.id, 'CARD_READY', 'Your visiting card is ready to download.')
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
    # Who pays is decided by the approved membership, never by the request body:
    # company-sponsored members get cards free, self-paid members pay the normal price.
    payer = membership.payer
    unit_price = 0 if payer == 'COMPANY' else INDIVIDUAL_CARD_PRICE
    order = CardOrder(company_id=company_id, user_id=user.id, membership_id=membership.id, quantity=body.quantity,
                      unit_price=unit_price, total_amount=unit_price * body.quantity, payer=payer, status='PAID')
    db.add(order); db.flush(); db.add(PaymentRecord(order_id=order.id, amount=order.total_amount))
    card_ids = []
    try:
        for _ in range(body.quantity):
            request = CardRequest(company_id=company_id, template_id=template.id, created_by_id=user.id, status='PROCESSING',
                items=[CardRequestItem(employee_id=membership.employee_id)])
            db.add(request); db.flush()
            request = db.scalar(select(CardRequest).where(CardRequest.id == request.id).options(selectinload(CardRequest.company), selectinload(CardRequest.template), selectinload(CardRequest.items).selectinload(CardRequestItem.employee), selectinload(CardRequest.items).selectinload(CardRequestItem.generated_card)))
            card = generate_cards(db, request)[0]; request.status = 'COMPLETED'; card_ids.append(card.id)
        add_audit(db, 'EMPLOYEE_CARD_ORDER', 'card_order', order.id, user.id, company_id, f'{body.quantity} cards; {payer}')
        db.commit()
        return {'order_id': order.id, 'quantity': order.quantity, 'unit_price': unit_price,
                'total_amount': order.total_amount, 'payer': order.payer, 'payment_status': 'PAID', 'card_ids': card_ids}
    except Exception:
        db.rollback()
        raise HTTPException(500, 'Card generation failed') from None


@router.post('/checkout/personal', response_model=CheckoutResponse, status_code=201)
def checkout_personal_cards(body: CardCheckout, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    unit_price = INDIVIDUAL_CARD_PRICE
    order = CardOrder(company_id=None, user_id=user.id, membership_id=None, quantity=body.quantity,
                      unit_price=unit_price, total_amount=unit_price * body.quantity, payer='INDIVIDUAL', status='PAID')
    db.add(order); db.flush(); db.add(PaymentRecord(order_id=order.id, amount=order.total_amount))
    company = SimpleNamespace(name='Personal Card', logo_path=None, website=None)
    employee = SimpleNamespace(name=body.name or user.username, designation=body.designation or 'Professional',
        department=body.department or 'Independent', email=user.email, phone=body.phone or 'Not provided', photo_path=None)
    directory = storage_root() / 'personal' / str(user.id) / f'order_{order.id}'; directory.mkdir(parents=True, exist_ok=True)
    cards = []
    try:
        for number in range(1, body.quantity + 1):
            path = directory / f'personal-card-{number}.pdf'
            render_card_pdf(path, company, employee, 'classic', f'personal-{order.id}-{number}')
            card = PersonalCard(user_id=user.id, order_id=order.id, file_path=str(path.resolve()), file_name=path.name)
            db.add(card); db.flush(); cards.append(card.id)
        add_audit(db, 'PERSONAL_CARD_ORDER', 'card_order', order.id, user.id, None, f'{body.quantity} cards')
        db.commit()
        return {'order_id': order.id, 'quantity': order.quantity, 'unit_price': unit_price,
                'total_amount': order.total_amount, 'payer': 'INDIVIDUAL', 'payment_status': 'PAID', 'card_ids': cards}
    except Exception:
        db.rollback()
        raise HTTPException(500, 'Personal card generation failed') from None


@router.get('/personal-cards')
def my_personal_cards(db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    cards = db.scalars(select(PersonalCard).where(PersonalCard.user_id == user.id).order_by(PersonalCard.id.desc())).all()
    # Never send the server's file path to the browser.
    columns = [c.name for c in PersonalCard.__table__.columns if c.name != 'file_path']
    return [{name: getattr(card, name) for name in columns} for card in cards]


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
    return FileResponse(card.file_path, media_type='application/pdf', filename=card.file_name)


@router.get('/cards', response_model=list[GeneratedCardResponse])
def my_cards(db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    return db.scalars(select(GeneratedCard).join(CardRequestItem).join(CardRequest).join(Membership,
        Membership.employee_id == GeneratedCard.employee_id).where(Membership.user_id == user.id,
        Membership.status == 'APPROVED').order_by(GeneratedCard.id.desc())).all()


@router.get('/cards/{card_id}/download')
def download_my_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles([EMPLOYEE]))):
    card = db.scalar(select(GeneratedCard).join(Membership, Membership.employee_id == GeneratedCard.employee_id).where(
        GeneratedCard.id == card_id, Membership.user_id == user.id, Membership.status == 'APPROVED'))
    if card is None:
        raise HTTPException(404, 'Card not found')
    path = Path(card.file_path)
    if not path.is_file():
        raise HTTPException(404, 'Generated PDF is missing')
    return FileResponse(path, media_type='application/pdf', filename=card.file_name)
