from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import CardRequestItem, Company, Employee, GeneratedCard
from app.schemas.domain import VerificationResponse

router = APIRouter(prefix='/verify', tags=['Public Card Verification'])


@router.get('/cards/{token}', response_model=VerificationResponse)
def verify_card(token: str, db: Session = Depends(get_db)):
    row = db.execute(
        select(GeneratedCard, Employee, Company)
        .join(Employee, Employee.id == GeneratedCard.employee_id)
        .join(Company, Company.id == GeneratedCard.company_id)
        .where(GeneratedCard.verification_token == token)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail='Card verification record not found')
    card, employee, company = row
    valid = card.status == 'ACTIVE' and employee.is_active and company.status == 'APPROVED'
    return {
        'valid': valid,
        'card_status': 'ACTIVE' if valid else 'INACTIVE',
        'employee_name': employee.name,
        'employee_id': employee.employee_id,
        'designation': employee.designation,
        'company_name': company.name,
        'issued_at': card.created_at,
    }
