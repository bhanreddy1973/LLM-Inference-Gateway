"""API key generation utilities."""

import secrets

from utils.hashing import hash_api_key


def generate_api_key(prefix: str = "sk-live") -> tuple[str, str, str]:
    """
    Generate a new API key.

    Returns:
        tuple: (full_key, key_prefix, key_hash)
            - full_key: The complete key to show the user once (e.g., sk-live-a1b2c3...)
            - key_prefix: First 12 chars for identification
            - key_hash: SHA-256 hash for database storage
    """
    random_part = secrets.token_hex(24)  # 48 hex chars
    full_key = f"{prefix}-{random_part}"
    key_prefix = full_key[:12]
    key_hash = hash_api_key(full_key)
    return full_key, key_prefix, key_hash
