"""SQLAlchemy ORM models for PostgreSQL."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


class User(Base):
    """User account model."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    tier = Column(
        String(20),
        nullable=False,
        default="free",
    )
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

    # Relationships
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("tier IN ('free', 'pro', 'enterprise')", name="check_user_tier"),
    )


class ApiKey(Base):
    """API key model — stores hashed keys only."""

    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key_hash = Column(String(64), unique=True, nullable=False)
    key_prefix = Column(String(12), nullable=False)
    name = Column(String(100), nullable=False, default="Default Key")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    # Per-key custom limits — override user tier when set
    requests_per_minute = Column(Integer, nullable=True)
    requests_per_day = Column(Integer, nullable=True)
    max_tokens_per_request = Column(Integer, nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")


class UsageLimit(Base):
    """Per-tier usage limits configuration."""

    __tablename__ = "usage_limits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tier = Column(String(20), unique=True, nullable=False)
    requests_per_minute = Column(Integer, nullable=False)
    requests_per_day = Column(Integer, nullable=False)
    max_tokens_per_request = Column(Integer, nullable=False, default=4096)
    max_context_window = Column(Integer, nullable=False, default=200000)
