from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, require_roles
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Company, User
from app.models.constants import COMPANY_ADMIN
from app.schemas.auth import CompanySummary, LoginRequest, RegisterRequest, RegistrationResponse, TokenResponse, UserResponse
from app.services.activity import add_audit, add_notification, notify_system_admins

router = APIRouter(prefix='/auth', tags=['Auth'])


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
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(body.email).lower()).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid credentials',
                            headers={'WWW-Authenticate': 'Bearer'})
    token = create_access_token({'user_id': str(user.id), 'role': user.role})
    return {'access_token': token}


@router.get('/me', response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get('/company', response_model=CompanySummary)
def my_company(current_user: User = Depends(require_roles([COMPANY_ADMIN]))):
    return current_user.company
