import csv
import io
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import require_approved_company_admin
from app.db.session import get_db
from app.models import Employee, GeneratedCard, User
from app.schemas.domain import CSVImportResponse, EmployeeCreate, EmployeeResponse, EmployeeStatusUpdate, EmployeeUpdate
from app.services.activity import add_audit
from app.services.assets import replace_asset, save_image, upload_root
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
    q: str | None = Query(default=None, max_length=100),
    department: str | None = Query(default=None, max_length=120),
    active: bool | None = None,
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    query = select(Employee).where(Employee.company_id == user.company_id)
    if q:
        term = f'%{q.strip()}%'
        query = query.where(or_(Employee.name.ilike(term), Employee.employee_id.ilike(term), Employee.email.ilike(term)))
    if department:
        query = query.where(Employee.department == department)
    if active is not None:
        query = query.where(Employee.is_active == active)
    return db.scalars(query.order_by(Employee.id).offset(offset).limit(limit)).all()


@router.get('/export')
def export_employees(
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    employees = db.scalars(select(Employee).where(Employee.company_id == user.company_id).order_by(Employee.id)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['employee_id', 'name', 'designation', 'department', 'email', 'phone', 'status'])
    for employee in employees:
        writer.writerow([employee.employee_id, employee.name, employee.designation, employee.department, employee.email, employee.phone, 'ACTIVE' if employee.is_active else 'INACTIVE'])
    return StreamingResponse(
        iter([output.getvalue()]), media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="employees.csv"'},
    )


@router.post('', response_model=EmployeeResponse, status_code=201)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    employee = Employee(company_id=user.company_id, **payload.model_dump())
    db.add(employee)
    try:
        db.flush()
        add_audit(db, 'EMPLOYEE_CREATED', 'employee', employee.id, user.id, user.company_id, employee.employee_id)
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
    add_audit(db, 'EMPLOYEE_UPDATED', 'employee', employee.id, user.id, user.company_id, employee.employee_id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Employee ID already exists in this company') from None
    db.refresh(employee)
    return employee


@router.patch('/{employee_id}/status', response_model=EmployeeResponse)
def update_employee_status(
    employee_id: int,
    payload: EmployeeStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    employee = company_employee(db, employee_id, user.company_id)
    employee.is_active = payload.is_active
    if not payload.is_active:
        db.execute(update(GeneratedCard).where(
            GeneratedCard.employee_id == employee.id,
            GeneratedCard.company_id == user.company_id,
        ).values(status='DEACTIVATED'))
    add_audit(db, 'EMPLOYEE_ACTIVATED' if payload.is_active else 'EMPLOYEE_DEACTIVATED', 'employee', employee.id, user.id, user.company_id)
    db.commit(); db.refresh(employee)
    return employee


@router.post('/{employee_id}/photo', response_model=EmployeeResponse)
async def upload_employee_photo(
    employee_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_approved_company_admin),
):
    employee = company_employee(db, employee_id, user.company_id)
    path = await save_image(file, upload_root() / f'company_{user.company_id}' / 'employees' / str(employee.id))
    employee.photo_path = replace_asset(employee.photo_path, path)
    add_audit(db, 'EMPLOYEE_PHOTO_UPDATED', 'employee', employee.id, user.id, user.company_id)
    db.commit(); db.refresh(employee)
    return employee


@router.get('/{employee_id}/photo')
def get_employee_photo(
    employee_id: int,
    user: User = Depends(require_approved_company_admin),
    db: Session = Depends(get_db),
):
    employee = company_employee(db, employee_id, user.company_id)
    path = Path(employee.photo_path or '')
    if not path.is_file():
        raise HTTPException(status_code=404, detail='Employee photo not found')
    return FileResponse(path)
