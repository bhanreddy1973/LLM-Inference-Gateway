"""Redis sliding window rate limiter.

Uses a Lua script with sorted sets for precise per-second fairness.
No burst problem at window boundaries (unlike fixed window counters).
"""

import time
from dataclasses import dataclass
from typing import Optional

import redis.asyncio as redis

from config import settings


# Lua script for sliding window rate limiting using sorted sets.
# Atomic operation — no race conditions between concurrent requests.
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count remaining entries
local count = redis.call('ZCARD', key)

if count < limit then
    -- Add current request timestamp
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    -- Set TTL on the key to auto-cleanup
    redis.call('EXPIRE', key, window)
    return {1, limit - count - 1, now + window}
else
    -- Rate limited — calculate reset time
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local reset_at = 0
    if #oldest > 0 then
        reset_at = tonumber(oldest[2]) + window
    else
        reset_at = now + window
    end
    return {0, 0, reset_at}
end
"""


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    allowed: bool
    limit: int
    remaining: int
    reset_at: int  # Unix timestamp


class RateLimiter:
    """
    Sliding window rate limiter backed by Redis sorted sets.

    Supports per-minute and per-day limits with separate windows.
    """

    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._script_sha: Optional[str] = None

    async def _get_redis(self) -> redis.Redis:
        """Lazy-init Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def _ensure_script(self, client: redis.Redis) -> str:
        """Load the Lua script and cache the SHA."""
        if self._script_sha is None:
            self._script_sha = await client.script_load(SLIDING_WINDOW_LUA)
        return self._script_sha

    async def check(
        self,
        user_id: str,
        requests_per_minute: int,
        requests_per_day: int,
    ) -> RateLimitResult:
        """
        Check rate limits for a user.

        Checks per-minute first, then per-day.
        Returns the most restrictive result.

        Args:
            user_id: The user's UUID string.
            requests_per_minute: Max requests allowed per 60s window.
            requests_per_day: Max requests allowed per 86400s window (-1 = unlimited).

        Returns:
            RateLimitResult with allowed status and headers info.
        """
        client = await self._get_redis()
        sha = await self._ensure_script(client)
        now = int(time.time() * 1000)  # milliseconds for precision

        # Check per-minute limit
        minute_result = await self._eval_limit(
            client=client,
            sha=sha,
            key=f"rl:min:{user_id}",
            window_ms=60_000,
            limit=requests_per_minute,
            now=now,
        )

        if not minute_result.allowed:
            return minute_result

        # Check per-day limit (skip if unlimited)
        if requests_per_day > 0:
            day_result = await self._eval_limit(
                client=client,
                sha=sha,
                key=f"rl:day:{user_id}",
                window_ms=86_400_000,
                limit=requests_per_day,
                now=now,
            )

            if not day_result.allowed:
                return day_result

            # Return the more restrictive remaining count
            if day_result.remaining < minute_result.remaining:
                return day_result

        return minute_result

    async def _eval_limit(
        self,
        client: redis.Redis,
        sha: str,
        key: str,
        window_ms: int,
        limit: int,
        now: int,
    ) -> RateLimitResult:
        """Execute the sliding window Lua script."""
        try:
            result = await client.evalsha(
                sha,
                1,       # number of keys
                key,     # KEYS[1]
                str(window_ms),  # ARGV[1]
                str(limit),      # ARGV[2]
                str(now),        # ARGV[3]
            )
        except redis.exceptions.NoScriptError:
            # Script evicted — reload
            self._script_sha = await client.script_load(SLIDING_WINDOW_LUA)
            result = await client.evalsha(
                self._script_sha,
                1,
                key,
                str(window_ms),
                str(limit),
                str(now),
            )

        allowed = bool(int(result[0]))
        remaining = int(result[1])
        reset_at = int(result[2]) // 1000  # Convert back to seconds for headers

        return RateLimitResult(
            allowed=allowed,
            limit=limit,
            remaining=remaining,
            reset_at=reset_at,
        )

    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.aclose()
            self._redis = None


# Singleton instance
rate_limiter = RateLimiter()
