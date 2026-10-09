from datetime import datetime
from uuid import UUID as PythonUUID
from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Company(Base):
    __tablename__ = 'companies'
    brand_kit: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='PENDING', index=True)
    selected_template_id: Mapped[int | None] = mapped_column(ForeignKey('card_templates.id'), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    admins = relationship('User', back_populates='company')
    employees = relationship('Employee', back_populates='company', cascade='all, delete-orphan')
    selected_template = relationship('CardTemplate', foreign_keys=[selected_template_id])
    __table_args__ = (
        CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')", name='check_company_status'),
    )

    @property
    def has_logo(self) -> bool:
        return bool(self.logo_path)


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
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    company = relationship('Company', back_populates='employees')
    __table_args__ = (UniqueConstraint('company_id', 'employee_id', name='uq_employee_company_code'),)

    @property
    def has_photo(self) -> bool:
        return bool(self.photo_path)


class CardTemplate(Base):
    __tablename__ = 'card_templates'
    company_id: Mapped[int | None] = mapped_column(ForeignKey('companies.id', name='fk_template_company', use_alter=True), nullable=True, index=True)
    design: Mapped[dict | None] = mapped_column(JSON, nullable=True)
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
    decided_by_id: Mapped[PythonUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    company = relationship('Company')
    template = relationship('CardTemplate')
    created_by = relationship('User', foreign_keys=[created_by_id])
    decided_by = relationship('User', foreign_keys=[decided_by_id])
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
    verification_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='ACTIVE', index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    item = relationship('CardRequestItem', back_populates='generated_card')
    employee = relationship('Employee')
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE','DEACTIVATED')", name='check_generated_card_status'),
    )


class Notification(Base):
    __tablename__ = 'notifications'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(String(300), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[PythonUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, index=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey('companies.id', ondelete='SET NULL'), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
