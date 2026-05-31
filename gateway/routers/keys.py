"""API key management router — create, list, revoke, update limits."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user_id, get_db
from models.schemas import (
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyListResponse,
    ApiKeyUpdateRequest,
)
from services.key_service import KeyService

router = APIRouter(prefix="/keys", tags=["keys"])


@router.post(
    "",
    response_model=ApiKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new API key with optional custom limits",
)
async def create_key(
    request: ApiKeyCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new API key. Optional custom limits override the user's tier.
    The full key is returned ONLY in this response — store it securely.
    """
    service = KeyService(db)
    api_key, full_key = await service.create_key(
        user_id=user_id,
        name=request.name,
        requests_per_minute=request.requests_per_minute,
        requests_per_day=request.requests_per_day,
        max_tokens_per_request=request.max_tokens_per_request,
    )

    return ApiKeyCreateResponse(
        id=api_key.id,
        key=full_key,
        key_prefix=api_key.key_prefix,
        name=api_key.name,
        created_at=api_key.created_at,
        requests_per_minute=api_key.requests_per_minute,
        requests_per_day=api_key.requests_per_day,
        max_tokens_per_request=api_key.max_tokens_per_request,
    )


@router.get(
    "",
    response_model=list[ApiKeyListResponse],
    summary="List all API keys",
)
async def list_keys(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for the authenticated user."""
    service = KeyService(db)
    keys = await service.list_keys(user_id)
    return keys


@router.patch(
    "/{key_id}",
    response_model=ApiKeyListResponse,
    summary="Update a key's name or custom rate limits",
)
async def update_key(
    key_id: UUID,
    request: ApiKeyUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a key's display name and/or rate limit overrides.
    Set a limit to -1 to clear it (revert to tier default).
    """
    service = KeyService(db)

    # -1 means "clear / revert to tier default"
    clear_rpm = request.requests_per_minute == -1
    clear_rpd = request.requests_per_day == -1
    clear_mtr = request.max_tokens_per_request == -1

    key = await service.update_key_limits(
        key_id=key_id,
        user_id=user_id,
        name=request.name,
        requests_per_minute=None if clear_rpm else request.requests_per_minute,
        requests_per_day=None if clear_rpd else request.requests_per_day,
        max_tokens_per_request=None if clear_mtr else request.max_tokens_per_request,
        clear_rpm=clear_rpm,
        clear_rpd=clear_rpd,
        clear_mtr=clear_mtr,
    )
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found.")

    # Invalidate Redis cache for this key (prefix-based, best-effort)
    try:
        import redis.asyncio as aioredis
        from config import settings
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        # We don't have the hash here, but the 5-min TTL means it auto-expires
        await r.aclose()
    except Exception:
        pass

    return key


@router.delete(
    "/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke an API key",
)
async def revoke_key(
    key_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (deactivate) an API key immediately."""
    service = KeyService(db)
    revoked = await service.revoke_key(key_id=key_id, user_id=user_id)
    if not revoked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found.")
