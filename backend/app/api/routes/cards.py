import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, or_
from sqlalchemy.orm import Session, selectinload
from app.api.deps import get_current_user, require_approved_company_admin, require_system_admin
from app.db.session import get_db
from app.models import CardOrder, CardRequest, CardRequestItem, CardTemplate, Employee, GeneratedCard, PaymentRecord, User
from app.schemas.domain import CardDecision, CardRequestCreate, CardRequestResponse, GeneratedCardResponse, PayOrderRequest, PayOrderResponse
from app.services.card_generation import generate_cards, safe_file_stem
from app.services.image_template_render import template_folder
from app.services.activity import add_audit, add_notification, notify_system_admins

router = APIRouter(tags=['Card Requests'])


def request_query():
    return select(CardRequest).options(
        selectinload(CardRequest.company),
        selectinload(CardRequest.template),
        selectinload(CardRequest.created_by),
        selectinload(CardRequest.items).selectinload(CardRequestItem.employee),
        selectinload(CardRequest.items).selectinload(CardRequestItem.generated_card),
        selectinload(CardRequest.order),
    )


@router.post('/card-requests', response_model=CardRequestResponse, status_code=201)
def create_card_request(
    body: CardRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    employee_ids = list(dict.fromkeys(body.employee_ids))
    if len(employee_ids) != len(body.employee_ids):
        raise HTTPException(status_code=422, detail='employee_ids must not contain duplicates')
    if user.company.selected_template_id != body.template_id:
        raise HTTPException(status_code=400, detail='Select this template before creating a request')
    template = db.scalar(select(CardTemplate).where(
        CardTemplate.id == body.template_id, CardTemplate.is_active.is_(True),
        or_(CardTemplate.company_id.is_(None), CardTemplate.company_id == user.company_id)
    ))
    if template is None:
        raise HTTPException(status_code=404, detail='Active template not found')
    employees = db.scalars(select(Employee).where(
        Employee.company_id == user.company_id, Employee.id.in_(employee_ids), Employee.is_active.is_(True)
    )).all()
    if len(employees) != len(employee_ids):
        raise HTTPException(status_code=404, detail='One or more employees were not found')
    request = CardRequest(
        company_id=user.company_id,
        template_id=template.id,
        created_by_id=user.id,
        status='PENDING',
        items=[CardRequestItem(employee_id=employee_id) for employee_id in employee_ids],
    )
    db.add(request)
    db.flush()

    card_count = len(employee_ids)
    unit_price = 50
    total_amount = card_count * unit_price
    order = CardOrder(
        company_id=user.company_id,
        user_id=user.id,
        membership_id=None,
        request_id=request.id,
        quantity=card_count,
        unit_price=unit_price,
        total_amount=total_amount,
        payer='COMPANY',
        status='PENDING_PAYMENT',
    )
    db.add(order)
    db.flush()

    notify_system_admins(db, 'CARD_REVIEW', f'{user.company.name} submitted card request #{request.id}.')
    add_audit(db, 'CARD_REQUEST_CREATED', 'card_request', request.id, user.id, user.company_id, f'{len(employee_ids)} card(s)')
    db.commit()
    return db.scalar(request_query().where(CardRequest.id == request.id))


@router.get('/card-requests', response_model=list[CardRequestResponse])
def list_company_requests(
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    return db.scalars(request_query().where(
        CardRequest.company_id == user.company_id
    ).order_by(CardRequest.id.desc())).all()


@router.get('/card-requests/{request_id}', response_model=CardRequestResponse)
def get_company_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    request = db.scalar(request_query().where(
        CardRequest.id == request_id, CardRequest.company_id == user.company_id
    ))
    if request is None:
        raise HTTPException(status_code=404, detail='Card request not found')
    return request


@router.get('/card-requests/{request_id}/cards', response_model=list[GeneratedCardResponse])
def list_generated_cards(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    owned = db.scalar(select(CardRequest.id).where(
        CardRequest.id == request_id, CardRequest.company_id == user.company_id
    ))
    if owned is None:
        raise HTTPException(status_code=404, detail='Card request not found')
    return db.scalars(
        select(GeneratedCard)
        .join(CardRequestItem)
        .where(CardRequestItem.request_id == request_id, GeneratedCard.company_id == user.company_id)
        .order_by(GeneratedCard.id)
    ).all()


@router.get('/cards/{card_id}/download')
def download_card(
    card_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    card = db.scalar(
        select(GeneratedCard)
        .where(GeneratedCard.id == card_id, GeneratedCard.company_id == user.company_id)
        .options(selectinload(GeneratedCard.item))
    )
    if card is None:
        raise HTTPException(status_code=404, detail='Card not found')
    if card.item and card.item.request_id:
        order = db.scalar(select(CardOrder).where(CardOrder.request_id == card.item.request_id))
        if order and order.status != 'PAID':
            raise HTTPException(status_code=402, detail=f'Payment required: Order #{order.id} is unpaid. Please complete payment to download.')
    path = Path(card.file_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail='Generated PDF is missing')
    return FileResponse(path, media_type='application/pdf', filename=card.file_name)


@router.get('/card-requests/{request_id}/cards/download')
def download_request_cards(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    order = db.scalar(select(CardOrder).where(CardOrder.request_id == request_id, CardOrder.company_id == user.company_id))
    if order and order.status != 'PAID':
        raise HTTPException(status_code=402, detail=f'Payment required: Invoice for Card Request #{request_id} has not been paid yet.')
    cards = db.scalars(
        select(GeneratedCard).join(CardRequestItem).where(
            CardRequestItem.request_id == request_id,
            GeneratedCard.company_id == user.company_id,
        ).order_by(GeneratedCard.id)
    ).all()
    if not cards:
        raise HTTPException(status_code=404, detail='No generated cards were found')
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for card in cards:
            path = Path(card.file_path)
            if path.is_file():
                bundle.write(path, arcname=card.file_name)
    archive.seek(0)
    return StreamingResponse(
        archive, media_type='application/zip',
        headers={'Content-Disposition': f'attachment; filename="card-request-{request_id}.zip"'},
    )


@router.get('/admin/card-requests', response_model=list[CardRequestResponse])
def admin_list_requests(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return db.scalars(request_query().order_by(CardRequest.id.desc())).all()


@router.patch('/admin/card-requests/{request_id}/decision', response_model=CardRequestResponse)
def decide_card_request(
    request_id: int,
    body: CardDecision,
    db: Session = Depends(get_db),
    admin: User = Depends(require_system_admin),
):
    request = db.scalar(request_query().where(CardRequest.id == request_id).with_for_update())
    if request is None:
        raise HTTPException(status_code=404, detail='Card request not found')

    if body.decision == 'REJECTED':
        if not (body.reason or '').strip():
            raise HTTPException(status_code=422, detail='A rejection reason is required')
        if request.status == 'REJECTED':
            return request
        if request.status != 'PENDING':
            raise HTTPException(status_code=409, detail=f'Request is already {request.status}')
        request.status = 'REJECTED'
        request.rejection_reason = body.reason.strip()
        request.decided_by_id = admin.id
        request.decided_at = datetime.now(timezone.utc)
        order = db.scalar(select(CardOrder).where(CardOrder.request_id == request.id))
        if order and order.status in ('PENDING_APPROVAL', 'PENDING_PAYMENT'):
            order.status = 'REJECTED'
        add_notification(db, request.created_by_id, 'CARD_REJECTED', f'Card request #{request.id} was rejected. Reason: {request.rejection_reason}')
        add_audit(db, 'CARD_REQUEST_REJECTED', 'card_request', request.id, admin.id, request.company_id, request.rejection_reason)
        db.commit()
        return db.scalar(request_query().where(CardRequest.id == request_id))

    if request.status == 'COMPLETED':
        return request
    if request.status != 'PENDING':
        raise HTTPException(status_code=409, detail=f'Request is already {request.status}')

    request.status = 'APPROVED'
    request.decided_by_id = admin.id
    request.decided_at = datetime.now(timezone.utc)
    db.commit()
    request.status = 'PROCESSING'
    db.commit()
    try:
        generate_cards(db, request)
        request.status = 'COMPLETED'
        # An employee's order waits for this approval before it can be paid.
        order = db.scalar(select(CardOrder).where(CardOrder.request_id == request.id))
        if order and order.status == 'PENDING_APPROVAL':
            order.status = 'PENDING_PAYMENT'
        add_notification(db, request.created_by_id, 'CARDS_APPROVED', f'Card request #{request.id} has been approved by admin. Please complete payment to download your cards.')
        add_audit(db, 'CARD_REQUEST_APPROVED', 'card_request', request.id, admin.id, request.company_id, f'{len(request.items)} card(s) generated; awaiting payment')
        db.commit()
    except Exception:
        db.rollback()
        failed = db.get(CardRequest, request_id)
        failed.status = 'FAILED'
        add_notification(db, failed.created_by_id, 'CARD_GENERATION_FAILED', f'Card request #{request.id} could not be generated.')
        add_audit(db, 'CARD_GENERATION_FAILED', 'card_request', request.id, admin.id, request.company_id)
        db.commit()
        raise HTTPException(status_code=500, detail='Card generation failed') from None
    return db.scalar(request_query().where(CardRequest.id == request_id))


# --- Cards as Illustrator (.ai) files -------------------------------------------------------------
# For templates made from an uploaded .ai: the design is kept as vector art with the employee's
# details placed on it, so a printer can open it in Illustrator. Available before approval too
# (without the verification QR, which does not exist until the card is generated).

AI_MEDIA_TYPE = 'application/illustrator'


def _ai_card(request: CardRequest, item: CardRequestItem) -> tuple[str, bytes]:
    from app.services import illustrator
    from app.services.illustrator_card import render_ai_card

    design = request.template.design if request.template else None
    ai = (design or {}).get('ai') if isinstance(design, dict) else None
    if not ai:
        raise HTTPException(status_code=404, detail='This template was not made from an Illustrator file')
    path = template_folder(design.get('company_id')) / Path(ai['file']).name
    if not path.is_file():
        raise HTTPException(status_code=404, detail='The Illustrator file for this template is missing')
    token = item.generated_card.verification_token if item.generated_card else None
    try:
        data = render_ai_card(path.read_bytes(), ai, design, request.company, item.employee, token)
    except illustrator.IllustratorError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
    return f'{safe_file_stem(item.employee.employee_id)}_card.ai', data


def _ai_response(name: str, data: bytes) -> StreamingResponse:
    return StreamingResponse(io.BytesIO(data), media_type=AI_MEDIA_TYPE, headers={'Content-Disposition': f'attachment; filename="{name}"'})


def _ai_zip_response(request: CardRequest) -> StreamingResponse:
    archive = io.BytesIO()
    used: set[str] = set()
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for item in request.items:
            name, data = _ai_card(request, item)
            while name in used:
                name = f'{item.id}_{name}'
            used.add(name)
            bundle.writestr(name, data)
    archive.seek(0)
    return StreamingResponse(archive, media_type='application/zip',
                             headers={'Content-Disposition': f'attachment; filename="card-request-{request.id}-ai.zip"'})


def _request_item(db: Session, request_id: int, item_id: int, company_id: int | None) -> tuple[CardRequest, CardRequestItem]:
    query = request_query().where(CardRequest.id == request_id)
    if company_id is not None:
        query = query.where(CardRequest.company_id == company_id)
    request = db.scalar(query)
    item = next((i for i in request.items if i.id == item_id), None) if request else None
    if request is None or item is None:
        raise HTTPException(status_code=404, detail='Card request not found')
    return request, item


@router.get('/admin/card-requests/{request_id}/items/{item_id}/ai')
def admin_download_ai(request_id: int, item_id: int, db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    request, item = _request_item(db, request_id, item_id, None)
    return _ai_response(*_ai_card(request, item))


@router.get('/admin/card-requests/{request_id}/ai')
def admin_download_all_ai(request_id: int, db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    request = db.scalar(request_query().where(CardRequest.id == request_id))
    if request is None:
        raise HTTPException(status_code=404, detail='Card request not found')
    return _ai_zip_response(request)


@router.get('/card-requests/{request_id}/items/{item_id}/ai')
def download_ai(request_id: int, item_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved_company_admin)):
    order = db.scalar(select(CardOrder).where(CardOrder.request_id == request_id, CardOrder.company_id == user.company_id))
    if order and order.status != 'PAID':
        raise HTTPException(status_code=402, detail=f'Payment required: Invoice for Card Request #{request_id} has not been paid yet.')
    request, item = _request_item(db, request_id, item_id, user.company_id)
    return _ai_response(*_ai_card(request, item))


@router.get('/card-requests/{request_id}/ai')
def download_all_ai(request_id: int, db: Session = Depends(get_db), user: User = Depends(require_approved_company_admin)):
    order = db.scalar(select(CardOrder).where(CardOrder.request_id == request_id, CardOrder.company_id == user.company_id))
    if order and order.status != 'PAID':
        raise HTTPException(status_code=402, detail=f'Payment required: Invoice for Card Request #{request_id} has not been paid yet.')
    request = db.scalar(request_query().where(CardRequest.id == request_id, CardRequest.company_id == user.company_id))
    if request is None:
        raise HTTPException(status_code=404, detail='Card request not found')
    return _ai_zip_response(request)


@router.post('/orders/{order_id}/pay', response_model=PayOrderResponse)
def pay_order(
    order_id: int,
    body: PayOrderRequest = PayOrderRequest(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.get(CardOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail='Order not found')
    is_owner = (order.user_id == user.id)
    is_company_admin = (user.role == 'COMPANY_ADMIN' and user.company_id == order.company_id)
    is_system_admin = (user.role == 'SYSTEM_ADMIN')
    if not (is_owner or is_company_admin or is_system_admin):
        raise HTTPException(status_code=403, detail='Not authorized to pay for this order')

    # Payment comes after approval, never before (same rule for companies and employees).
    if order.status == 'PENDING_APPROVAL' or (order.request_id and order.status != 'PAID' and order.request and order.request.status != 'COMPLETED'):
        raise HTTPException(status_code=409, detail='This order is waiting for approval. You can pay once it is approved.')
    if order.status == 'REJECTED':
        raise HTTPException(status_code=409, detail='This order was rejected and cannot be paid.')
    if order.status == 'PAID':
        return PayOrderResponse(
            order_id=order.id,
            status='PAID',
            total_amount=order.total_amount,
            method=body.method,
            message='Order is already paid.',
        )

    order.status = 'PAID'
    record = db.scalar(select(PaymentRecord).where(PaymentRecord.order_id == order.id))
    if not record:
        db.add(PaymentRecord(order_id=order.id, amount=order.total_amount, method=body.method, status='PAID'))
    else:
        record.status = 'PAID'
        record.method = body.method

    add_audit(db, 'ORDER_PAID', 'card_order', str(order.id), user.id, order.company_id, f'Paid ৳{order.total_amount} via {body.method}')
    add_notification(db, order.user_id, 'ORDER_PAID', f'Payment of ৳{order.total_amount} for Order #{order.id} was confirmed.')
    db.commit()
    return PayOrderResponse(
        order_id=order.id,
        status='PAID',
        total_amount=order.total_amount,
        method=body.method,
        message='Payment confirmed successfully.',
    )
