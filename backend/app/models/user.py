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
    avatar_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    company = relationship('Company', back_populates='admins')

    @property
    def has_avatar(self) -> bool:
        return bool(self.avatar_path)

    @property
    def avatar_version(self) -> int:
        from pathlib import Path

        try:
            return int(Path(self.avatar_path).stat().st_mtime) if self.avatar_path else 0
        except OSError:
            return 0
    memberships = relationship('Membership', back_populates='user', cascade='all, delete-orphan')
    __table_args__ = (
        CheckConstraint("role IN ('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE')", name='check_user_role'),
        CheckConstraint(
            "(role IN ('SYSTEM_ADMIN', 'EMPLOYEE') AND company_id IS NULL) OR "
            "(role = 'COMPANY_ADMIN' AND company_id IS NOT NULL)",
            name='check_user_company',
        ),
    )
