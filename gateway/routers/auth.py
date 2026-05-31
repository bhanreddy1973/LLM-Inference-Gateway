"""Auth router — registration and login endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from dependencies import get_current_user_id, get_db
from models.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
)
from services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def me(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update name or password",
)
async def update_me(
    request: UserUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update display name or change password."""
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if request.name is not None:
        user.name = request.name

    if request.new_password:
        from utils.hashing import verify_password, hash_password
        if not request.current_password or not verify_password(request.current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
        user.password_hash = hash_password(request.new_password)

    db.add(user)
    await db.flush()
    return user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    request: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user account.

    Returns the created user profile. The user starts on the 'free' tier.
    """
    service = UserService(db)
    try:
        user = await service.register(
            email=request.email,
            password=request.password,
            name=request.name,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get JWT token",
)
async def login(
    request: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with email and password.

    Returns a JWT access token for use with protected endpoints.
    """
    service = UserService(db)
    user = await service.authenticate(
        email=request.email,
        password=request.password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = UserService.create_access_token(user.id)
    return TokenResponse(access_token=token)
