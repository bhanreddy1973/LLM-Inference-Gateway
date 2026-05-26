"""Async batched request logger for ClickHouse.

Buffers log entries in an asyncio Queue and flushes to ClickHouse
every 5 seconds OR when the buffer reaches 100 entries — whichever
comes first. Gateway latency is unaffected (fire-and-forget).
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import clickhouse_connect

from config import settings

logger = logging.getLogger(__name__)

# Flush configuration
BATCH_SIZE = 100
FLUSH_INTERVAL_SECONDS = 5


class RequestLogger:
    """
    Async batched logger that writes inference request logs to ClickHouse.

    Usage:
        await request_logger.log(entry)
        # On app startup:
        request_logger.start()
        # On app shutdown:
        await request_logger.shutdown()
    """

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._flush_task: Optional[asyncio.Task] = None
        self._client = None
        self._running = False

    def _get_client(self):
        """Lazy-init ClickHouse client."""
        if self._client is None:
            self._client = clickhouse_connect.get_client(
                host=settings.clickhouse_host,
                port=settings.clickhouse_port,
            )
        return self._client

    def start(self):
        """Start the background flush task."""
        if not self._running:
            self._running = True
            self._flush_task = asyncio.create_task(self._flush_loop())
            logger.info("RequestLogger started — flushing to ClickHouse")

    async def shutdown(self):
        """Flush remaining buffer and stop."""
        self._running = False
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass

        # Final flush
        await self._flush()
        logger.info("RequestLogger shutdown complete")

    async def log(
        self,
        request_id: UUID,
        user_id: UUID,
        api_key_prefix: str,
        model: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        total_tokens: int = 0,
        max_tokens: int = 0,
        temperature: float = 0.0,
        stream: bool = False,
        time_to_first_token_ms: int = 0,
        total_latency_ms: int = 0,
        worker_id: str = "",
        status_code: int = 200,
        error_type: Optional[str] = None,
        finish_reason: str = "stop",
    ):
        """Add a log entry to the buffer (non-blocking)."""
        # Estimate cost (Claude Sonnet pricing: $3/M input, $15/M output)
        estimated_cost = (input_tokens * 3.0 / 1_000_000) + (output_tokens * 15.0 / 1_000_000)

        entry = (
            str(request_id),
            str(user_id),
            api_key_prefix,
            model,
            input_tokens,
            output_tokens,
            total_tokens,
            max_tokens,
            temperature,
            stream,
            time_to_first_token_ms,
            total_latency_ms,
            worker_id,
            status_code,
            error_type,
            finish_reason,
            datetime.now(timezone.utc),
            estimated_cost,
        )

        await self._queue.put(entry)

    async def _flush_loop(self):
        """Background loop — flush every FLUSH_INTERVAL or when buffer is full."""
        while self._running:
            try:
                await asyncio.sleep(FLUSH_INTERVAL_SECONDS)
                await self._flush()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Flush loop error: {e}", exc_info=True)

    async def _flush(self):
        """Flush all buffered entries to ClickHouse."""
        entries = []
        while not self._queue.empty() and len(entries) < BATCH_SIZE * 2:
            try:
                entry = self._queue.get_nowait()
                entries.append(entry)
            except asyncio.QueueEmpty:
                break

        if not entries:
            return

        try:
            client = self._get_client()
            client.insert(
                "inference_logs",
                entries,
                column_names=[
                    "request_id",
                    "user_id",
                    "api_key_prefix",
                    "model",
                    "input_tokens",
                    "output_tokens",
                    "total_tokens",
                    "max_tokens",
                    "temperature",
                    "stream",
                    "time_to_first_token_ms",
                    "total_latency_ms",
                    "worker_id",
                    "status_code",
                    "error_type",
                    "finish_reason",
                    "created_at",
                    "estimated_cost_usd",
                ],
            )
            logger.debug(f"Flushed {len(entries)} entries to ClickHouse")
        except Exception as e:
            logger.error(f"ClickHouse insert failed: {e}", exc_info=True)
            # Re-queue entries on failure (best effort)
            for entry in entries:
                try:
                    self._queue.put_nowait(entry)
                except asyncio.QueueFull:
                    break


# Singleton instance
request_logger = RequestLogger()
