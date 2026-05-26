"""Pydantic request/response schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ─── Auth Schemas ───────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    """Request body for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)


class UserLoginRequest(BaseModel):
    """Request body for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user representation."""
    id: uuid.UUID
    email: str
    name: str
    tier: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


# ─── API Key Schemas ────────────────────────────────────────────────────────

class ApiKeyCreateRequest(BaseModel):
    """Request body for creating an API key."""
    name: str = Field(default="Default Key", max_length=100)


class ApiKeyCreateResponse(BaseModel):
    """Response after creating an API key — only time the full key is shown."""
    id: uuid.UUID
    key: str  # Full key (sk-live-xxx) — shown only once
    key_prefix: str
    name: str
    created_at: datetime


class ApiKeyListResponse(BaseModel):
    """API key in list view — no full key shown."""
    id: uuid.UUID
    key_prefix: str
    name: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Chat Schemas ───────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """A single message in the conversation."""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Request body for chat completion."""
    model: str = "claude-sonnet-4-20250514"
    messages: list[ChatMessage] = Field(..., min_length=1)
    max_tokens: int = Field(default=1024, ge=1, le=8192)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    stream: bool = False


class ChatChoice(BaseModel):
    """A single choice in the chat response."""
    index: int = 0
    message: ChatMessage
    finish_reason: str


class UsageInfo(BaseModel):
    """Token usage information."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatResponse(BaseModel):
    """Non-streaming chat completion response."""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[ChatChoice]
    usage: UsageInfo


# ─── Error Schemas ──────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    """Error detail."""
    type: str
    message: str
    retry_after: Optional[int] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: ErrorDetail
