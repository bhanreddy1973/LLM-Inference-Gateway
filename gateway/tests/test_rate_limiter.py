"""Tests for the rate limiter logic (unit tests — no Redis required)."""

from middleware.rate_limiter import RateLimitResult


def test_rate_limit_result_allowed():
    """Allowed result should have remaining > 0."""
    result = RateLimitResult(allowed=True, limit=60, remaining=59, reset_at=1700000000)
    assert result.allowed is True
    assert result.remaining == 59
    assert result.limit == 60


def test_rate_limit_result_denied():
    """Denied result should have remaining = 0."""
    result = RateLimitResult(allowed=False, limit=60, remaining=0, reset_at=1700000060)
    assert result.allowed is False
    assert result.remaining == 0


def test_rate_limit_headers_format():
    """Rate limit result should provide correct header values."""
    result = RateLimitResult(allowed=True, limit=100, remaining=42, reset_at=1700000100)
    # These values are used for X-RateLimit-* headers
    assert str(result.limit) == "100"
    assert str(result.remaining) == "42"
    assert str(result.reset_at) == "1700000100"
