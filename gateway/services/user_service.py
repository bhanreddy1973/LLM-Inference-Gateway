"""User service — registration, login, and user queries."""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.database import User
from utils.hashing import hash_password, verify_password


class UserService:
    """Handles user registration, authentication, and queries."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, email: str, password: str, name: str) -> User:
        """
        Register a new user.

        Raises:
            ValueError: If email already exists.
        """
        # Check for existing user
        existing = await self.get_by_email(email)
        if existing:
            raise ValueError("A user with this email already exists.")

        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            tier="free",
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user by email and password.

        Returns:
            User if credentials are valid, None otherwise.
        """
        user = await self.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        return user

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by email address."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get a user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    def create_access_token(user_id: UUID) -> str:
        """Create a JWT access token for a user."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiry_minutes)
        payload = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    @staticmethod
    def decode_token(token: str) -> Optional[str]:
        """
        Decode and validate a JWT token.

        Returns:
            The user_id (sub claim) if valid, None otherwise.
        """
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
            )
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return user_id
        except JWTError:
            return None
