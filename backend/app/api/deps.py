from uuid import UUID
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.constants import COMPANY_ADMIN, SYSTEM_ADMIN
from app.models.user import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
):
    error = HTTPException(status_code=401, detail='Invalid credentials', headers={'WWW-Authenticate': 'Bearer'})
    if credentials is None:
        raise error
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key,
                             algorithms=[settings.algorithm], options={'require_exp': True})
        user_id = UUID(payload['user_id'])
    except (JWTError, ValueError, KeyError, TypeError, AttributeError):
        raise error
    user = db.get(User, user_id)
    if user is None:
        raise error
    return user


def require_roles(allowed_roles: list[str]):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail='Insufficient permission')
        return current_user
    return checker


def require_system_admin(current_user: User = Depends(require_roles([SYSTEM_ADMIN]))):
    return current_user


def require_approved_company_admin(current_user: User = Depends(require_roles([COMPANY_ADMIN]))):
    if current_user.company is None or current_user.company.status != 'APPROVED':
        raise HTTPException(status_code=403, detail='Company approval is required')
    return current_user
