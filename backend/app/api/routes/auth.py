import threading
import time
from collections import defaultdict, deque

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_roles
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Company, Membership, User
from app.models.constants import COMPANY_ADMIN, EMPLOYEE
from app.schemas.auth import (
    CompanySummary, EmployeeRegisterRequest, LoginRequest, ProfileUpdateRequest, RegisterRequest, RegistrationResponse, TokenResponse,
    UserResponse,
)
from app.services.activity import add_audit, add_notification, notify_system_admins
from app.services.assets import replace_asset, save_image, upload_root

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


@router.patch('/me', response_model=UserResponse)
def update_me(body: ProfileUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Change your own name and sign-in email. A new email needs the current password."""
    changes = []
    if body.username is not None and body.username != current_user.username:
        current_user.username = body.username
        changes.append('name')
    if body.email is not None and body.email != current_user.email:
        if not body.current_password or not verify_password(body.current_password, current_user.password_hash):
            raise HTTPException(status_code=403, detail='Enter your current password to change your email')
        current_user.email = body.email
        changes.append('email')
    if not changes:
        return current_user
    add_audit(db, 'PROFILE_UPDATED', 'user', str(current_user.id), current_user.id, current_user.company_id, ', '.join(changes))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='That email is already used by another account') from None
    db.refresh(current_user)
    return current_user


@router.post('/me/avatar', response_model=UserResponse)
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Set or replace your profile picture (JPG, PNG or WebP, up to 2 MB)."""
    path = await save_image(file, upload_root() / 'avatars' / str(current_user.id))
    current_user.avatar_path = replace_asset(current_user.avatar_path, path)
    add_audit(db, 'PROFILE_PICTURE_UPDATED', 'user', str(current_user.id), current_user.id, current_user.company_id)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete('/me/avatar', response_model=UserResponse)
def remove_avatar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.avatar_path:
        Path(current_user.avatar_path).unlink(missing_ok=True)
        current_user.avatar_path = None
        add_audit(db, 'PROFILE_PICTURE_REMOVED', 'user', str(current_user.id), current_user.id, current_user.company_id)
        db.commit()
        db.refresh(current_user)
    return current_user


@router.get('/me/avatar')
def get_avatar(current_user: User = Depends(get_current_user)):
    path = Path(current_user.avatar_path or '')
    if not path.is_file():
        raise HTTPException(status_code=404, detail='No profile picture')
    return FileResponse(path, headers={'Cache-Control': 'private, max-age=3600'})


@router.get('/company', response_model=CompanySummary)
def my_company(current_user: User = Depends(require_roles([COMPANY_ADMIN]))):
    return current_user.company
