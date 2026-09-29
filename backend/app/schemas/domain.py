from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.schemas.auth import UserResponse, CompanySummary


class CompanyStatusUpdate(BaseModel):
    status: Literal['APPROVED', 'REJECTED', 'SUSPENDED']


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    status: str
    selected_template_id: int | None
    created_at: datetime
    admins: list[UserResponse]


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: str
    name: str
    designation: str
    department: str
    email: str
    phone: str


class EmployeeCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    employee_id: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    designation: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=120)
    email: EmailStr = Field(max_length=255)
    phone: str = Field(min_length=1, max_length=50)

    @field_validator('employee_id', 'name', 'designation', 'department', 'phone')
    @classmethod
    def clean_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Cannot be blank')
        return value.strip()

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class EmployeeUpdate(EmployeeCreate):
    pass


class CSVImportResponse(BaseModel):
    imported: int


class TemplateCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default='', max_length=255)
    style_key: Literal['classic', 'modern', 'minimal']
    is_active: bool = True


class TemplateUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    style_key: str
    is_active: bool


class CardRequestCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    employee_ids: list[int] = Field(min_length=1)
    template_id: int


class CardItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    employee: EmployeeResponse


class CardRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    template_id: int
    status: str
    rejection_reason: str | None
    created_at: datetime
    items: list[CardItemResponse]
    company: CompanySummary
    template: TemplateResponse
    created_by: UserResponse


class CardDecision(BaseModel):
    decision: Literal['APPROVED', 'REJECTED']
    reason: str | None = Field(default=None, max_length=500)


class GeneratedCardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    file_name: str
    file_size: int
    created_at: datetime
