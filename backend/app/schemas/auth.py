from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Role = Literal['SYSTEM_ADMIN', 'COMPANY_ADMIN']


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    username: str = Field(min_length=1, max_length=50)
    company_name: str = Field(min_length=1, max_length=150)
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError('Password must contain an uppercase letter')
        if not any(char.islower() for char in value):
            raise ValueError('Password must contain a lowercase letter')
        if not any(char.isdigit() for char in value):
            raise ValueError('Password must contain a number')
        if not any(not char.isalnum() and not char.isspace() for char in value):
            raise ValueError('Password must contain a special character')
        return value

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        email = str(value).strip().lower()
        if email.rsplit('@', 1)[-1] != 'gmail.com':
            raise ValueError('Registration requires a valid @gmail.com address')
        return email

    @field_validator('username', 'company_name')
    @classmethod
    def clean_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Cannot be blank')
        return value.strip()


class SystemAdminCredentials(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    username: str
    email: str
    role: Role
    company_id: int | None


class CompanySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    status: str
    selected_template_id: int | None


class RegistrationResponse(BaseModel):
    user: UserResponse
    company: CompanySummary


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'


LoginRegister = LoginRequest
