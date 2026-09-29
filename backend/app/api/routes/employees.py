from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import require_approved_company_admin
from app.db.session import get_db
from app.models import Employee, User
from app.schemas.domain import CSVImportResponse, EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.services.employee_import import CSVImportError, import_employees

router = APIRouter(prefix='/employees', tags=['Employees'])


def company_employee(db: Session, employee_id: int, company_id: int) -> Employee:
    employee = db.scalar(select(Employee).where(
        Employee.id == employee_id, Employee.company_id == company_id
    ))
    if employee is None:
        raise HTTPException(status_code=404, detail='Employee not found')
    return employee


@router.post('/import', response_model=CSVImportResponse, status_code=201)
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail='A CSV file is required')
    content = await file.read(2_000_001)
    if len(content) > 2_000_000:
        raise HTTPException(status_code=413, detail='CSV file is too large')
    try:
        imported = import_employees(db, user.company_id, content)
    except CSVImportError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
    return {'imported': imported}


@router.get('', response_model=list[EmployeeResponse])
def list_employees(
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    return db.scalars(
        select(Employee).where(Employee.company_id == user.company_id).order_by(Employee.id)
    ).all()


@router.post('', response_model=EmployeeResponse, status_code=201)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    employee = Employee(company_id=user.company_id, **payload.model_dump())
    db.add(employee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Employee ID already exists in this company') from None
    db.refresh(employee)
    return employee


@router.get('/{employee_id}', response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    return company_employee(db, employee_id, user.company_id)


@router.put('/{employee_id}', response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    employee = company_employee(db, employee_id, user.company_id)
    for key, value in payload.model_dump().items():
        setattr(employee, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Employee ID already exists in this company') from None
    db.refresh(employee)
    return employee
