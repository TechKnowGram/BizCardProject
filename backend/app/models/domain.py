from datetime import datetime
from uuid import UUID as PythonUUID
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Company(Base):
    __tablename__ = 'companies'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='PENDING', index=True)
    selected_template_id: Mapped[int | None] = mapped_column(ForeignKey('card_templates.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    admins = relationship('User', back_populates='company')
    employees = relationship('Employee', back_populates='company', cascade='all, delete-orphan')
    selected_template = relationship('CardTemplate', foreign_keys=[selected_template_id])
    __table_args__ = (
        CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')", name='check_company_status'),
    )


class Employee(Base):
    __tablename__ = 'employees'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    designation: Mapped[str] = mapped_column(String(120), nullable=False)
    department: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    company = relationship('Company', back_populates='employees')
    __table_args__ = (UniqueConstraint('company_id', 'employee_id', name='uq_employee_company_code'),)


class CardTemplate(Base):
    __tablename__ = 'card_templates'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False, default='')
    style_key: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class CardRequest(Base):
    __tablename__ = 'card_requests'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey('card_templates.id'), nullable=False)
    created_by_id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='PENDING', index=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    company = relationship('Company')
    template = relationship('CardTemplate')
    created_by = relationship('User', foreign_keys=[created_by_id])
    items = relationship('CardRequestItem', back_populates='request', cascade='all, delete-orphan')
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED')",
            name='check_card_request_status',
        ),
    )


class CardRequestItem(Base):
    __tablename__ = 'card_request_items'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey('card_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey('employees.id'), nullable=False)
    request = relationship('CardRequest', back_populates='items')
    employee = relationship('Employee')
    generated_card = relationship('GeneratedCard', back_populates='item', uselist=False)
    __table_args__ = (UniqueConstraint('request_id', 'employee_id', name='uq_request_employee'),)


class GeneratedCard(Base):
    __tablename__ = 'generated_cards'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_item_id: Mapped[int] = mapped_column(ForeignKey('card_request_items.id', ondelete='CASCADE'), unique=True, nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey('employees.id'), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    item = relationship('CardRequestItem', back_populates='generated_card')
    employee = relationship('Employee')
