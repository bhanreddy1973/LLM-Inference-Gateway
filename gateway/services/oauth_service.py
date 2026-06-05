"""OAuth service — handles Google and GitHub OAuth flows."""

from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.database import User


class OAuthService:
    """Handles OAuth authentication for Google and GitHub."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Google ────────────────────────────────────────────────────────────

    @staticmethod
    def get_google_auth_url(redirect_uri: str) -> str:
        """Build the Google OAuth authorization URL."""
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return f"https://accounts.google.com/o/oauth2/v2/auth?{qs}"

    @staticmethod
    async def exchange_google_code(code: str, redirect_uri: str) -> dict:
        """Exchange an authorization code for Google user info."""
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            # Get user info
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            userinfo_resp.raise_for_status()
            return userinfo_resp.json()

    # ─── GitHub ────────────────────────────────────────────────────────────

    @staticmethod
    def get_github_auth_url(redirect_uri: str) -> str:
        """Build the GitHub OAuth authorization URL."""
        params = {
            "client_id": settings.github_client_id,
            "redirect_uri": redirect_uri,
            "scope": "read:user user:email",
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return f"https://github.com/login/oauth/authorize?{qs}"

    @staticmethod
    async def exchange_github_code(code: str, redirect_uri: str) -> dict:
        """Exchange an authorization code for GitHub user info."""
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "code": code,
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()
            access_token = tokens["access_token"]

            # Get user profile
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_resp.raise_for_status()
            user_data = user_resp.json()

            # Get primary email (may not be public)
            email = user_data.get("email")
            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                emails_resp.raise_for_status()
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get("primary")), None)
                email = primary["email"] if primary else emails[0]["email"]

            return {
                "id": str(user_data["id"]),
                "email": email,
                "name": user_data.get("name") or user_data.get("login", ""),
            }

    # ─── Shared ────────────────────────────────────────────────────────────

    async def get_or_create_oauth_user(
        self, provider: str, oauth_id: str, email: str, name: str
    ) -> User:
        """
        Find a user by OAuth provider+ID, or link to existing email, or create new.

        Strategy:
        1. Look up by (provider, oauth_id) — returning user on match.
        2. Look up by email — link OAuth to existing account.
        3. Create a brand new user with no password.
        """
        # 1. Try provider + oauth_id
        result = await self.db.execute(
            select(User).where(
                User.oauth_provider == provider,
                User.oauth_id == oauth_id,
            )
        )
        user = result.scalar_one_or_none()
        if user:
            return user

        # 2. Try by email — link OAuth
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        if user:
            user.oauth_provider = provider
            user.oauth_id = oauth_id
            self.db.add(user)
            await self.db.flush()
            return user

        # 3. Create new OAuth user (no password)
        user = User(
            email=email,
            name=name,
            password_hash=None,
            oauth_provider=provider,
            oauth_id=oauth_id,
            tier="free",
        )
        self.db.add(user)
        await self.db.flush()
        return user
