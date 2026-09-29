from datetime import UTC, datetime, timedelta
from jose import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from app.core.config import settings

pwd_context = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, UnknownHashError):
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode['exp'] = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
