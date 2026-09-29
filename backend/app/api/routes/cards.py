from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.api.deps import require_approved_company_admin, require_system_admin
from app.db.session import get_db
from app.models import CardRequest, CardRequestItem, CardTemplate, Employee, GeneratedCard, User
from app.schemas.domain import CardDecision, CardRequestCreate, CardRequestResponse, GeneratedCardResponse
from app.services.card_generation import generate_cards

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
        CardTemplate.id == body.template_id, CardTemplate.is_active.is_(True)
    ))
    if template is None:
        raise HTTPException(status_code=404, detail='Active template not found')
    employees = db.scalars(select(Employee).where(
        Employee.company_id == user.company_id, Employee.id.in_(employee_ids)
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


@router.get('/admin/card-requests', response_model=list[CardRequestResponse])
def admin_list_requests(db: Session = Depends(get_db), _: User = Depends(require_system_admin)):
    return db.scalars(request_query().order_by(CardRequest.id.desc())).all()


@router.patch('/admin/card-requests/{request_id}/decision', response_model=CardRequestResponse)
def decide_card_request(
    request_id: int,
    body: CardDecision,
    db: Session = Depends(get_db),
    _: User = Depends(require_system_admin),
):
    request = db.scalar(request_query().where(CardRequest.id == request_id).with_for_update())
    if request is None:
        raise HTTPException(status_code=404, detail='Card request not found')

    if body.decision == 'REJECTED':
        if request.status == 'REJECTED':
            return request
        if request.status != 'PENDING':
            raise HTTPException(status_code=409, detail=f'Request is already {request.status}')
        request.status = 'REJECTED'
        request.rejection_reason = body.reason
        db.commit()
        return db.scalar(request_query().where(CardRequest.id == request_id))

    if request.status == 'COMPLETED':
        return request
    if request.status != 'PENDING':
        raise HTTPException(status_code=409, detail=f'Request is already {request.status}')

    request.status = 'APPROVED'
    db.commit()
    request.status = 'PROCESSING'
    db.commit()
    try:
        generate_cards(db, request)
        request.status = 'COMPLETED'
        db.commit()
    except Exception:
        db.rollback()
        failed = db.get(CardRequest, request_id)
        failed.status = 'FAILED'
        db.commit()
        raise HTTPException(status_code=500, detail='Card generation failed') from None
    return db.scalar(request_query().where(CardRequest.id == request_id))
