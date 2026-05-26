"""Auth router — registration and login endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_db
from models.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


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
