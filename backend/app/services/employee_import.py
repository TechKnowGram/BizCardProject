import csv
import io
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models import Employee

REQUIRED_HEADERS = ('employee_id', 'name', 'designation', 'department', 'email', 'phone')
email_validator = TypeAdapter(EmailStr)


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
    headers = tuple(reader.fieldnames or ())
    missing = [name for name in REQUIRED_HEADERS if name not in headers]
    if missing:
        raise CSVImportError(f"Missing required headers: {', '.join(missing)}")

    parsed = []
    seen = set()
    for row_number, row in enumerate(reader, start=2):
        values = {key: (row.get(key) or '').strip() for key in REQUIRED_HEADERS}
        empty = [key for key, value in values.items() if not value]
        if empty:
            raise CSVImportError(f"Row {row_number}: empty fields: {', '.join(empty)}")
        if values['employee_id'] in seen:
            raise CSVImportError(f"Row {row_number}: duplicate employee_id {values['employee_id']}")
        seen.add(values['employee_id'])
        try:
            values['email'] = str(email_validator.validate_python(values['email'])).lower()
        except ValidationError:
            raise CSVImportError(f"Row {row_number}: invalid email") from None
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

    db.add_all(Employee(company_id=company_id, **values) for values in parsed)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise CSVImportError('Employee import conflicts with existing data') from None
    return len(parsed)

