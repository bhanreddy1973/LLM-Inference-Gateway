"""API Key authentication middleware.

Validates the X-API-Key header against PostgreSQL (with Redis cache).
Attaches user context to the request state for downstream handlers.
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

import redis.asyncio as redis
import json

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from dependencies import get_db
from services.key_service import KeyService
from utils.hashing import hash_api_key


# Redis cache TTL for validated keys (5 minutes)
KEY_CACHE_TTL = 300


@dataclass
class RequestContext:
    """User context attached to authenticated requests."""
    user_id: UUID
    tier: str
    key_prefix: str
    requests_per_minute: int
    requests_per_day: int
    max_tokens_per_request: int


async def get_redis_client() -> redis.Redis:
    """Get a Redis client instance."""
    return redis.from_url(settings.redis_url, decode_responses=True)


async def validate_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RequestContext:
    """
    Dependency that validates the X-API-Key header.

    Flow:
        1. Extract API key from header
        2. Check Redis cache (SHA-256 hash as key)
        3. On cache miss, query PostgreSQL
        4. Cache the result in Redis for 5 minutes
        5. Return RequestContext with user info and limits

    Raises:
        HTTPException 401: If key is missing, invalid, or expired.
        HTTPException 403: If user account is suspended.
    """
    # Extract API key from header
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header.",
        )

    key_hash = hash_api_key(api_key)

    # Try Redis cache first
    redis_client = await get_redis_client()
    try:
        cached = await redis_client.get(f"cached_key:{key_hash}")
        if cached:
            data = json.loads(cached)
            return RequestContext(
                user_id=UUID(data["user_id"]),
                tier=data["tier"],
                key_prefix=data["key_prefix"],
                requests_per_minute=data["requests_per_minute"],
                requests_per_day=data["requests_per_day"],
                max_tokens_per_request=data["max_tokens_per_request"],
            )
    except Exception:
        # Redis down — fall through to PostgreSQL
        pass

    # Cache miss — validate against PostgreSQL
    service = KeyService(db)
    result = await service.validate_key(api_key)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key.",
        )

    api_key_obj, user = result

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended.",
        )

    # Determine rate limits from tier
    tier_limits = _get_tier_limits(user.tier)

    ctx = RequestContext(
        user_id=user.id,
        tier=user.tier,
        key_prefix=api_key_obj.key_prefix,
        requests_per_minute=tier_limits["requests_per_minute"],
        requests_per_day=tier_limits["requests_per_day"],
        max_tokens_per_request=tier_limits["max_tokens_per_request"],
    )

    # Cache in Redis
    try:
        cache_data = json.dumps({
            "user_id": str(ctx.user_id),
            "tier": ctx.tier,
            "key_prefix": ctx.key_prefix,
            "requests_per_minute": ctx.requests_per_minute,
            "requests_per_day": ctx.requests_per_day,
            "max_tokens_per_request": ctx.max_tokens_per_request,
        })
        await redis_client.set(f"cached_key:{key_hash}", cache_data, ex=KEY_CACHE_TTL)
    except Exception:
        # Redis down — continue without caching
        pass
    finally:
        await redis_client.aclose()

    return ctx


def _get_tier_limits(tier: str) -> dict:
    """Get rate limits for a tier. Fallback if DB query isn't used."""
    defaults = {
        "free": {"requests_per_minute": 10, "requests_per_day": 100, "max_tokens_per_request": 1024},
        "pro": {"requests_per_minute": 60, "requests_per_day": 5000, "max_tokens_per_request": 4096},
        "enterprise": {"requests_per_minute": 300, "requests_per_day": -1, "max_tokens_per_request": 8192},
    }
    return defaults.get(tier, defaults["free"])
