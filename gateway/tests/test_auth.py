"""Tests for auth utilities — hashing, key generation, JWT."""

from uuid import uuid4

from utils.hashing import hash_password, verify_password, hash_api_key
from utils.key_generator import generate_api_key


def test_password_hashing():
    """Password hash and verify roundtrip."""
    password = "my-secret-password-123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_password_hash_different_each_time():
    """Bcrypt should produce different hashes for the same password."""
    password = "same-password"
    h1 = hash_password(password)
    h2 = hash_password(password)
    assert h1 != h2  # Different salts
    assert verify_password(password, h1) is True
    assert verify_password(password, h2) is True


def test_api_key_hash_deterministic():
    """SHA-256 hash of API key should be deterministic."""
    key = "sk-live-abcdef123456"
    h1 = hash_api_key(key)
    h2 = hash_api_key(key)
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex digest


def test_api_key_hash_different_for_different_keys():
    """Different keys produce different hashes."""
    h1 = hash_api_key("sk-live-key1")
    h2 = hash_api_key("sk-live-key2")
    assert h1 != h2


def test_generate_api_key_format():
    """Generated API keys should follow sk-live-* format."""
    full_key, key_prefix, key_hash = generate_api_key()
    assert full_key.startswith("sk-live-")
    assert len(full_key) > 20
    assert key_prefix == full_key[:12]
    assert len(key_hash) == 64


def test_generate_api_key_unique():
    """Each generated key should be unique."""
    keys = {generate_api_key()[0] for _ in range(100)}
    assert len(keys) == 100


def test_jwt_create_and_decode():
    """JWT token creation and decoding roundtrip."""
    from services.user_service import UserService
    user_id = uuid4()
    token = UserService.create_access_token(user_id)
    assert token is not None

    decoded_id = UserService.decode_token(token)
    assert decoded_id == str(user_id)


def test_jwt_decode_invalid_token():
    """Invalid JWT should return None."""
    from services.user_service import UserService
    result = UserService.decode_token("invalid.token.here")
    assert result is None
