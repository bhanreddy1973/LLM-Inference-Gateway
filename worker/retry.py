"""Exponential backoff retry logic for transient failures."""

import asyncio
import random
from typing import Optional


class RetryPolicy:
    """
    Exponential backoff with jitter.

    Retries on 429 (rate limit) and 5xx (server error) from Anthropic.
    """

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    def get_delay(self, attempt: int, retry_after: Optional[float] = None) -> float:
        """
        Calculate delay for a given attempt.

        Uses exponential backoff with full jitter.
        Respects Retry-After header if provided.
        """
        if retry_after and retry_after > 0:
            return retry_after

        # Exponential backoff: base * 2^attempt
        delay = self.base_delay * (2 ** attempt)
        # Cap at max
        delay = min(delay, self.max_delay)
        # Full jitter: random between 0 and calculated delay
        delay = random.uniform(0, delay)
        return delay

    def should_retry(self, attempt: int, status_code: Optional[int] = None) -> bool:
        """
        Determine if a request should be retried.

        Retries on:
            - 429 (rate limited by Anthropic)
            - 500, 502, 503, 529 (server errors)
            - Connection errors (status_code=None)
        """
        if attempt >= self.max_retries:
            return False

        if status_code is None:
            # Connection error — always retry
            return True

        retryable_codes = {429, 500, 502, 503, 529}
        return status_code in retryable_codes

    async def wait(self, attempt: int, retry_after: Optional[float] = None) -> None:
        """Sleep for the calculated delay."""
        delay = self.get_delay(attempt, retry_after)
        await asyncio.sleep(delay)
