"""Tests for exponential backoff retry logic."""

import asyncio
import time

import sys
sys.path.insert(0, "..")

from retry import RetryPolicy


def test_should_retry_under_max():
    policy = RetryPolicy(max_retries=3)
    assert policy.should_retry(0, 429) is True
    assert policy.should_retry(1, 500) is True
    assert policy.should_retry(2, 502) is True


def test_should_not_retry_at_max():
    policy = RetryPolicy(max_retries=3)
    assert policy.should_retry(3, 429) is False
    assert policy.should_retry(4, 500) is False


def test_should_retry_connection_error():
    policy = RetryPolicy(max_retries=3)
    assert policy.should_retry(0, None) is True
    assert policy.should_retry(2, None) is True


def test_should_not_retry_non_retryable_code():
    policy = RetryPolicy(max_retries=3)
    assert policy.should_retry(0, 400) is False
    assert policy.should_retry(0, 401) is False
    assert policy.should_retry(0, 404) is False


def test_retryable_status_codes():
    policy = RetryPolicy(max_retries=5)
    for code in [429, 500, 502, 503, 529]:
        assert policy.should_retry(0, code) is True


def test_get_delay_exponential():
    policy = RetryPolicy(max_retries=5, base_delay=1.0, max_delay=30.0)
    # Delays should increase but stay within bounds
    for attempt in range(5):
        delay = policy.get_delay(attempt)
        max_expected = min(1.0 * (2 ** attempt), 30.0)
        assert 0 <= delay <= max_expected


def test_get_delay_respects_retry_after():
    policy = RetryPolicy(max_retries=3, base_delay=1.0)
    delay = policy.get_delay(0, retry_after=10.0)
    assert delay == 10.0


def test_get_delay_capped_at_max():
    policy = RetryPolicy(max_retries=10, base_delay=1.0, max_delay=5.0)
    delay = policy.get_delay(8)  # 2^8 = 256, should be capped
    assert delay <= 5.0


def test_wait_actually_sleeps():
    policy = RetryPolicy(max_retries=3, base_delay=0.01, max_delay=0.05)
    start = time.time()
    asyncio.run(policy.wait(0))
    elapsed = time.time() - start
    assert elapsed < 0.1  # Should be very fast with small delays
