"""Password reset service — token generation, validation, and email sending."""

import hashlib
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.database import PasswordResetToken, User


class PasswordResetService:
    """Handles password reset token creation, validation, and email dispatch."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_reset_token(self, email: str) -> Optional[str]:
        """
        Generate a password reset token for the given email.

        Returns the raw token string if user exists, None otherwise.
        We always return success to the caller (to prevent email enumeration).
        """
        # Find user by email
        result = await self.db.execute(
            select(User).where(User.email == email, User.is_active.is_(True))
        )
        user = result.scalar_one_or_none()
        if not user:
            return None

        # OAuth-only users without a password can still set one via reset
        # Generate a secure random token
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.password_reset_expiry_minutes
        )

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(reset_token)
        await self.db.flush()

        return raw_token

    async def validate_and_consume_token(self, raw_token: str) -> Optional[User]:
        """
        Validate a reset token and mark it as used.

        Returns the User if the token is valid and unused, None otherwise.
        """
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        result = await self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
        )
        reset_token = result.scalar_one_or_none()
        if not reset_token:
            return None

        # Mark as used
        reset_token.used_at = datetime.now(timezone.utc)
        self.db.add(reset_token)

        # Get the user
        result = await self.db.execute(
            select(User).where(User.id == reset_token.user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    def send_reset_email(to_email: str, reset_token: str) -> bool:
        """
        Send the password reset email via SMTP.

        Returns True if sent successfully, False otherwise.
        If SMTP is not configured, logs the token (for development).
        """
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"

        # If SMTP is not configured, just log (development mode)
        if not settings.smtp_host or not settings.smtp_user:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[DEV] Password reset link for {to_email}: {reset_url}")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Reset your Acheron password"
            msg["From"] = settings.smtp_from_email
            msg["To"] = to_email

            text_body = f"""Hi,

You requested a password reset for your Acheron account.

Click the link below to reset your password (valid for {settings.password_reset_expiry_minutes} minutes):

{reset_url}

If you didn't request this, you can safely ignore this email.

— The Acheron Team
"""

            html_body = f"""
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #fafafa; margin: 0;">Acheron</h2>
  </div>
  <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
    You requested a password reset for your Acheron account.
    Click the button below to choose a new password.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{reset_url}"
       style="display: inline-block; background: #fafafa; color: #18181b; padding: 12px 32px;
              border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Reset Password
    </a>
  </div>
  <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
    This link expires in {settings.password_reset_expiry_minutes} minutes.
    If you didn't request this, you can safely ignore this email.
  </p>
</div>
"""

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            if settings.smtp_use_tls:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)

            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
            server.quit()
            return True

        except Exception:
            import logging
            logging.getLogger(__name__).exception("Failed to send password reset email")
            return False
