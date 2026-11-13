import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_roles
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Company, Membership, User
from app.models.constants import COMPANY_ADMIN, EMPLOYEE
from app.schemas.auth import CompanySummary, EmployeeRegisterRequest, LoginRequest, RegisterRequest, RegistrationResponse, TokenResponse, UserResponse
from app.services.activity import add_audit, add_notification, notify_system_admins

router = APIRouter(prefix='/auth', tags=['Auth'])

# --- Sign-in protection -----------------------------------------------------
# Failed sign-ins are counted per (client IP, email). After MAX_FAILURES within
# WINDOW_SECONDS further attempts are refused for the rest of the window. This is
# an in-process limiter; behind several workers use a shared store (e.g. Redis).
MAX_FAILURES = 8
WINDOW_SECONDS = 10 * 60
_failures: dict[tuple[str, str], deque] = defaultdict(deque)
_failures_lock = threading.Lock()
# Verified against when the email is unknown, so timing does not reveal which emails exist.
_DUMMY_HASH = hash_password('not-a-real-password-placeholder')


def _recent_failures(key: tuple[str, str]) -> deque:
    attempts = _failures[key]
    cutoff = time.monotonic() - WINDOW_SECONDS
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    return attempts


@router.post('/register', response_model=RegistrationResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    company = Company(name=body.company_name, status='PENDING')
    db.add(company)
    db.flush()
    user = User(
        username=body.username,
        email=str(body.email).lower(),
        password_hash=hash_password(body.password),
        role=COMPANY_ADMIN,
        company_id=company.id,
    )
    db.add(user)
    try:
        db.flush()
        add_notification(db, user.id, 'COMPANY_SUBMITTED', 'Your company registration is waiting for review.')
        notify_system_admins(db, 'COMPANY_REVIEW', f'{company.name} submitted a registration request.')
        add_audit(db, 'COMPANY_REGISTERED', 'company', company.id, user.id, company.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Email already registered') from None
    db.refresh(company)
    db.refresh(user)
    return {'user': user, 'company': company}


@router.post('/login', response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = str(body.email).lower()
    key = (request.client.host if request.client else 'unknown', email)
    with _failures_lock:
        if len(_recent_failures(key)) >= MAX_FAILURES:
            raise HTTPException(status_code=429, detail='Too many sign-in attempts. Please wait a few minutes and try again.')
    user = db.query(User).filter(User.email == email).first()
    valid = verify_password(body.password, user.password_hash if user else _DUMMY_HASH) and user is not None
    if not valid:
        with _failures_lock:
            _recent_failures(key).append(time.monotonic())
        raise HTTPException(status_code=401, detail='Invalid credentials',
                            headers={'WWW-Authenticate': 'Bearer'})
    with _failures_lock:
        _failures.pop(key, None)
    token = create_access_token({'user_id': str(user.id), 'role': user.role})
    return {'access_token': token}


@router.post('/employee/register', response_model=UserResponse, status_code=201)
def register_employee(body: EmployeeRegisterRequest, db: Session = Depends(get_db)):
    user = User(username=body.username, email=str(body.email).lower(),
                password_hash=hash_password(body.password), role=EMPLOYEE, company_id=None)
    db.add(user)
    try:
        db.flush()
        for membership in db.scalars(select(Membership).where(Membership.user_id.is_(None),
            Membership.official_email == user.email, Membership.status == 'PRE_APPROVED')):
            membership.user_id = user.id
            membership.status = 'APPROVED'
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Email already registered') from None
    db.refresh(user)
    return user


@router.get('/me', response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get('/company', response_model=CompanySummary)
def my_company(current_user: User = Depends(require_roles([COMPANY_ADMIN]))):
    return current_user.company
