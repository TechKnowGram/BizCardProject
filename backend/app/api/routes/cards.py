import io
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, or_
from sqlalchemy.orm import Session, selectinload
from app.api.deps import require_approved_company_admin, require_system_admin
from app.db.session import get_db
from app.models import CardRequest, CardRequestItem, CardTemplate, Employee, GeneratedCard, User
from app.schemas.domain import CardDecision, CardRequestCreate, CardRequestResponse, GeneratedCardResponse
from app.services.card_generation import generate_cards
from app.services.activity import add_audit, add_notification, notify_system_admins

router = APIRouter(tags=['Card Requests'])


def request_query():
    return select(CardRequest).options(
        selectinload(CardRequest.company),
        selectinload(CardRequest.template),
        selectinload(CardRequest.created_by),
        selectinload(CardRequest.items).selectinload(CardRequestItem.employee),
        selectinload(CardRequest.items).selectinload(CardRequestItem.generated_card),
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
    card = db.scalar(select(GeneratedCard).where(
        GeneratedCard.id == card_id, GeneratedCard.company_id == user.company_id
    ))
    if card is None:
        raise HTTPException(status_code=404, detail='Card not found')
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
        add_notification(db, request.created_by_id, 'CARDS_READY', f'Card request #{request.id} is complete and ready to download.')
        add_audit(db, 'CARD_REQUEST_APPROVED', 'card_request', request.id, admin.id, request.company_id, f'{len(request.items)} card(s) generated')
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
