"""Auth router — registration, login, OAuth, and password reset endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from config import settings
from dependencies import get_current_user_id, get_db
from models.schemas import (
    ForgotPasswordRequest,
    MessageResponse,
    OAuthCallbackRequest,
    OAuthUrlResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    UserUpdateRequest,
)
from services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


# ─── Profile ──────────────────────────────────────────────────────────────────


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


# ─── Registration & Login ─────────────────────────────────────────────────────


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


# ─── OAuth — Google ───────────────────────────────────────────────────────────


@router.get(
    "/oauth/google/url",
    response_model=OAuthUrlResponse,
    summary="Get Google OAuth authorization URL",
)
async def google_oauth_url():
    """Returns the URL to redirect the user to for Google login."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured.",
        )
    from services.oauth_service import OAuthService
    redirect_uri = f"{settings.frontend_url}/login?provider=google"
    url = OAuthService.get_google_auth_url(redirect_uri)
    return OAuthUrlResponse(url=url)


@router.post(
    "/oauth/google/callback",
    response_model=TokenResponse,
    summary="Exchange Google OAuth code for JWT",
)
async def google_oauth_callback(
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange Google authorization code for a JWT token."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured.",
        )

    from services.oauth_service import OAuthService

    try:
        user_info = await OAuthService.exchange_google_code(
            code=request.code,
            redirect_uri=request.redirect_uri,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Google. Please try again.",
        )

    service = OAuthService(db)
    user = await service.get_or_create_oauth_user(
        provider="google",
        oauth_id=user_info["id"],
        email=user_info["email"],
        name=user_info.get("name", user_info.get("email", "")),
    )

    token = UserService.create_access_token(user.id)
    return TokenResponse(access_token=token)


# ─── OAuth — GitHub ───────────────────────────────────────────────────────────


@router.get(
    "/oauth/github/url",
    response_model=OAuthUrlResponse,
    summary="Get GitHub OAuth authorization URL",
)
async def github_oauth_url():
    """Returns the URL to redirect the user to for GitHub login."""
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth is not configured.",
        )
    from services.oauth_service import OAuthService
    redirect_uri = f"{settings.frontend_url}/login?provider=github"
    url = OAuthService.get_github_auth_url(redirect_uri)
    return OAuthUrlResponse(url=url)


@router.post(
    "/oauth/github/callback",
    response_model=TokenResponse,
    summary="Exchange GitHub OAuth code for JWT",
)
async def github_oauth_callback(
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange GitHub authorization code for a JWT token."""
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth is not configured.",
        )

    from services.oauth_service import OAuthService

    try:
        user_info = await OAuthService.exchange_github_code(
            code=request.code,
            redirect_uri=request.redirect_uri,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with GitHub. Please try again.",
        )

    service = OAuthService(db)
    user = await service.get_or_create_oauth_user(
        provider="github",
        oauth_id=user_info["id"],
        email=user_info["email"],
        name=user_info.get("name", ""),
    )

    token = UserService.create_access_token(user.id)
    return TokenResponse(access_token=token)


# ─── Password Reset ──────────────────────────────────────────────────────────


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset email",
)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a password reset email if the account exists.

    Always returns success to prevent email enumeration.
    """
    from services.password_reset_service import PasswordResetService

    service = PasswordResetService(db)
    token = await service.create_reset_token(request.email)

    if token:
        # Send email (non-blocking in production, but fine for now)
        PasswordResetService.send_reset_email(request.email, token)

    # Always return success (prevent email enumeration)
    return MessageResponse(
        message="If an account exists with that email, a reset link has been sent."
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password with token",
)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset a user's password using a valid reset token."""
    from services.password_reset_service import PasswordResetService
    from utils.hashing import hash_password

    service = PasswordResetService(db)
    user = await service.validate_and_consume_token(request.token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    # Set new password
    user.password_hash = hash_password(request.new_password)
    db.add(user)
    await db.flush()

    return MessageResponse(message="Password has been reset successfully.")
