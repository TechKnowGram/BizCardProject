import csv
import io
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models import Employee, Membership, User

REQUIRED_FIELDS = ('employee_id', 'name', 'email')
HEADER_ALIASES = {
    'full_name': 'name',
    'fullname': 'name',
    'employee_name': 'name',
    'official_email': 'email',
    'officialemail': 'email',
    'work_email': 'email',
    'employee_id': 'employee_id',
    'employeeid': 'employee_id',
    'emp_id': 'employee_id',
    'id': 'employee_id',
}
email_validator = TypeAdapter(EmailStr)


def normalize_header_name(header: str) -> str:
    cleaned = (header or '').strip().lower().replace(' ', '_').replace('-', '_')
    return HEADER_ALIASES.get(cleaned, cleaned)


class CSVImportError(ValueError):
    pass


def import_employees(db: Session, company_id: int, content: bytes) -> int:
    try:
        text = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise CSVImportError('CSV must use UTF-8 encoding') from None
    try:
        reader = csv.DictReader(io.StringIO(text))
    except csv.Error as exc:
        raise CSVImportError(f'Invalid CSV: {exc}') from None
    raw_headers = tuple(reader.fieldnames or ())
    header_map = {h: normalize_header_name(h) for h in raw_headers}
    normalized_headers = set(header_map.values())

    missing = [name for name in REQUIRED_FIELDS if name not in normalized_headers]
    if missing:
        readable = [('full_name (or name)' if m == 'name' else 'official_email (or email)' if m == 'email' else m) for m in missing]
        raise CSVImportError(f"Missing required headers: {', '.join(readable)}")

    parsed = []
    seen = set()
    for row_number, row in enumerate(reader, start=2):
        # A leading apostrophe is how our own export (and Excel) marks text such as '+880...; drop it on import.
        row_normalized = {header_map.get(k, k): (v or '').strip().removeprefix("'") for k, v in row.items()}
        values = {
            'employee_id': row_normalized.get('employee_id', '').strip(),
            'name': row_normalized.get('name', '').strip(),
            'email': row_normalized.get('email', '').strip(),
            'designation': row_normalized.get('designation', '').strip() or 'Staff',
            'department': row_normalized.get('department', '').strip() or 'General',
            'phone': row_normalized.get('phone', '').strip(),
        }
        empty = [key for key in REQUIRED_FIELDS if not values[key]]
        if empty:
            readable_empty = [('full_name' if k == 'name' else 'official_email' if k == 'email' else k) for k in empty]
            raise CSVImportError(f"Row {row_number}: empty fields: {', '.join(readable_empty)}")
        if values['employee_id'] in seen:
            raise CSVImportError(f"Row {row_number}: duplicate employee_id {values['employee_id']}")
        seen.add(values['employee_id'])
        try:
            values['email'] = str(email_validator.validate_python(values['email'])).strip().lower()
        except ValidationError:
            raise CSVImportError(f"Row {row_number}: invalid email") from None

        status_str = row_normalized.get('status', 'ACTIVE').upper()
        values['is_active'] = status_str != 'INACTIVE'
        parsed.append(values)

    if not parsed:
        raise CSVImportError('CSV contains no employee rows')

    existing = set(db.scalars(
        select(Employee.employee_id).where(
            Employee.company_id == company_id,
            Employee.employee_id.in_(seen),
        )
    ).all())
    if existing:
        raise CSVImportError(f"employee_id already exists: {', '.join(sorted(existing))}")

    employees = [Employee(company_id=company_id, **values) for values in parsed]
    db.add_all(employees)
    try:
        db.flush()
        emails = [emp.email for emp in employees]
        accounts_by_email = {
            u.email: u for u in db.scalars(
                select(User).where(User.email.in_(emails), User.role == 'EMPLOYEE')
            ).all()
        }
        for employee in employees:
            account = accounts_by_email.get(employee.email)
            membership = Membership(
                company_id=company_id,
                employee_id=employee.id,
                user_id=account.id if account else None,
                official_email=employee.email,
                employee_code=employee.employee_id,
                payer='COMPANY',
                match_status='ROSTER_MATCHED' if account else None,
                status='APPROVED' if (account and employee.is_active) else 'PRE_APPROVED',
            )
            db.add(membership)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CSVImportError('Employee import conflicts with existing data') from None
    return len(parsed)

