"""API key service — generation, validation, and CRUD."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import ApiKey, User
from utils.hashing import hash_api_key
from utils.key_generator import generate_api_key


class KeyService:
    """Handles API key lifecycle — create, list, revoke, validate, update limits."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_key(
        self,
        user_id: UUID,
        name: str = "Default Key",
        requests_per_minute: Optional[int] = None,
        requests_per_day: Optional[int] = None,
        max_tokens_per_request: Optional[int] = None,
    ) -> tuple[ApiKey, str]:
        """
        Generate a new API key for a user.
        Custom limits override the user's tier defaults when set.

        Returns:
            tuple: (ApiKey model, full_key_string)
        """
        full_key, key_prefix, key_hash = generate_api_key()

        api_key = ApiKey(
            user_id=user_id,
            key_hash=key_hash,
            key_prefix=key_prefix,
            name=name,
            requests_per_minute=requests_per_minute,
            requests_per_day=requests_per_day,
            max_tokens_per_request=max_tokens_per_request,
        )
        self.db.add(api_key)
        await self.db.flush()
        return api_key, full_key

    async def list_keys(self, user_id: UUID) -> list[ApiKey]:
        """List all API keys for a user."""
        result = await self.db.execute(
            select(ApiKey)
            .where(ApiKey.user_id == user_id)
            .order_by(ApiKey.created_at.desc())
        )
        return list(result.scalars().all())

    async def revoke_key(self, key_id: UUID, user_id: UUID) -> bool:
        """Revoke (deactivate) an API key."""
        result = await self.db.execute(
            update(ApiKey)
            .where(ApiKey.id == key_id, ApiKey.user_id == user_id)
            .values(is_active=False)
            .returning(ApiKey.id)
        )
        return result.scalar_one_or_none() is not None

    async def update_key_limits(
        self,
        key_id: UUID,
        user_id: UUID,
        name: Optional[str] = None,
        requests_per_minute: Optional[int] = None,
        requests_per_day: Optional[int] = None,
        max_tokens_per_request: Optional[int] = None,
        clear_rpm: bool = False,
        clear_rpd: bool = False,
        clear_mtr: bool = False,
    ) -> Optional[ApiKey]:
        """
        Update name and/or custom rate limits on a key.
        Pass clear_* = True to reset a limit to NULL (use tier default).
        """
        values: dict = {}
        if name is not None:
            values["name"] = name
        if clear_rpm:
            values["requests_per_minute"] = None
        elif requests_per_minute is not None:
            values["requests_per_minute"] = requests_per_minute
        if clear_rpd:
            values["requests_per_day"] = None
        elif requests_per_day is not None:
            values["requests_per_day"] = requests_per_day
        if clear_mtr:
            values["max_tokens_per_request"] = None
        elif max_tokens_per_request is not None:
            values["max_tokens_per_request"] = max_tokens_per_request

        if not values:
            # Nothing to update — just return the current key
            result = await self.db.execute(
                select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id)
            )
            return result.scalar_one_or_none()

        result = await self.db.execute(
            update(ApiKey)
            .where(ApiKey.id == key_id, ApiKey.user_id == user_id)
            .values(**values)
            .returning(ApiKey)
        )
        return result.scalar_one_or_none()

    async def validate_key(self, raw_key: str) -> Optional[tuple[ApiKey, User]]:
        """
        Validate an API key and return the associated key + user.
        """
        key_hash = hash_api_key(raw_key)

        result = await self.db.execute(
            select(ApiKey, User)
            .join(User, ApiKey.user_id == User.id)
            .where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active == True,
                User.is_active == True,
            )
        )
        row = result.first()
        if row is None:
            return None

        api_key, user = row

        # Check expiry
        if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
            return None

        # Update last_used_at
        await self.db.execute(
            update(ApiKey)
            .where(ApiKey.id == api_key.id)
            .values(last_used_at=datetime.now(timezone.utc))
        )

        return api_key, user
