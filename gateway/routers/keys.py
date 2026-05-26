"""API key management router — create, list, revoke keys."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user_id, get_db
from models.schemas import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyListResponse
from services.key_service import KeyService

router = APIRouter(prefix="/keys", tags=["keys"])


@router.post(
    "",
    response_model=ApiKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new API key",
)
async def create_key(
    request: ApiKeyCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new API key for the authenticated user.

    The full key is returned ONLY in this response — store it securely.
    Subsequent requests will only show the key prefix.
    """
    service = KeyService(db)
    api_key, full_key = await service.create_key(user_id=user_id, name=request.name)

    return ApiKeyCreateResponse(
        id=api_key.id,
        key=full_key,
        key_prefix=api_key.key_prefix,
        name=api_key.name,
        created_at=api_key.created_at,
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
    """
    Revoke (deactivate) an API key.

    The key will immediately stop working for authentication.
    """
    service = KeyService(db)
    revoked = await service.revoke_key(key_id=key_id, user_id=user_id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found.",
        )
