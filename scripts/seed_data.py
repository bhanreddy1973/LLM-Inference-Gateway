"""Seed script — creates test users and API keys for development."""

import asyncio
import hashlib
import secrets
import sys
from pathlib import Path

# Add gateway to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "gateway"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import settings
from models.database import ApiKey, Base, User
from utils.hashing import hash_password


def generate_api_key() -> tuple[str, str, str]:
    """Generate an API key and return (full_key, prefix, hash)."""
    random_part = secrets.token_hex(24)
    full_key = f"sk-live-{random_part}"
    prefix = full_key[:12]
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, prefix, key_hash


async def seed():
    """Seed the database with test data."""
    engine = create_async_engine(settings.database_url, echo=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Check if data already exists
        result = await session.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        if count > 0:
            print("Database already seeded. Skipping.")
            return

        # Create test users
        users = [
            User(
                email="admin@example.com",
                password_hash=hash_password("admin12345"),
                name="Admin User",
                tier="enterprise",
            ),
            User(
                email="pro@example.com",
                password_hash=hash_password("prouserpw"),
                name="Pro User",
                tier="pro",
            ),
            User(
                email="free@example.com",
                password_hash=hash_password("freeuserpw"),
                name="Free User",
                tier="free",
            ),
        ]

        for user in users:
            session.add(user)
        await session.flush()

        # Create API keys for each user
        print("\n=== Generated API Keys (save these!) ===\n")
        for user in users:
            full_key, prefix, key_hash = generate_api_key()
            api_key = ApiKey(
                user_id=user.id,
                key_hash=key_hash,
                key_prefix=prefix,
                name=f"{user.name}'s Key",
            )
            session.add(api_key)
            print(f"  {user.email} ({user.tier}): {full_key}")

        await session.commit()
        print("\nSeed complete!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
