"""Hashing utilities — bcrypt for passwords, SHA-256 for API keys."""

import hashlib

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_api_key(api_key: str) -> str:
    """SHA-256 hash an API key for storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()
