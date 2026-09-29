import uuid
from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class User(Base):
    __tablename__ = 'users'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    company_id: Mapped[int | None] = mapped_column(ForeignKey('companies.id'), nullable=True, index=True)
    company = relationship('Company', back_populates='admins')
    __table_args__ = (
        CheckConstraint("role IN ('SYSTEM_ADMIN', 'COMPANY_ADMIN')", name='check_user_role'),
        CheckConstraint(
            "(role = 'SYSTEM_ADMIN' AND company_id IS NULL) OR "
            "(role = 'COMPANY_ADMIN' AND company_id IS NOT NULL)",
            name='check_user_company',
        ),
    )
