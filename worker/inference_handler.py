"""Anthropic API client with streaming support, retry, and circuit breaker."""

import time
from typing import AsyncGenerator, Optional

import anthropic

from circuit_breaker import CircuitBreaker
from config import settings
from retry import RetryPolicy


class InferenceHandler:
    """
    Handles inference requests to the Anthropic Claude API.

    Features:
        - Streaming token-by-token responses
        - Exponential backoff retry on transient failures
        - Circuit breaker to avoid hammering a failing API
        - Metrics collection (tokens, latency, TTFT)
    """

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=settings.failure_threshold,
            recovery_timeout=settings.recovery_timeout,
        )
        self.retry_policy = RetryPolicy(
            max_retries=settings.max_retries,
            base_delay=settings.retry_base_delay,
            max_delay=settings.retry_max_delay,
        )

    async def infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: Optional[list[str]] = None,
    ) -> dict:
        """
        Non-streaming inference — returns the full response at once.

        Returns:
            dict with keys: content, finish_reason, usage, performance
        """
        if not self.circuit_breaker.is_available:
            raise RuntimeError("Circuit breaker is OPEN — Anthropic API unavailable.")

        start_time = time.time()
        attempt = 0

        while True:
            try:
                response = await self.client.messages.create(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    stop_sequences=stop_sequences or [],
                )

                self.circuit_breaker.record_success()

                total_latency_ms = int((time.time() - start_time) * 1000)

                return {
                    "content": response.content[0].text if response.content else "",
                    "finish_reason": response.stop_reason or "stop",
                    "usage": {
                        "input_tokens": response.usage.input_tokens,
                        "output_tokens": response.usage.output_tokens,
                        "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
                    },
                    "performance": {
                        "time_to_first_token_ms": total_latency_ms,  # Non-streaming: same as total
                        "total_latency_ms": total_latency_ms,
                        "worker_id": settings.worker_id,
                    },
                }

            except anthropic.RateLimitError as e:
                self.circuit_breaker.record_failure()
                if not self.retry_policy.should_retry(attempt, 429):
                    raise
                retry_after = _extract_retry_after(e)
                await self.retry_policy.wait(attempt, retry_after)
                attempt += 1

            except anthropic.InternalServerError as e:
                self.circuit_breaker.record_failure()
                if not self.retry_policy.should_retry(attempt, 500):
                    raise
                await self.retry_policy.wait(attempt)
                attempt += 1

            except anthropic.APIConnectionError:
                self.circuit_breaker.record_failure()
                if not self.retry_policy.should_retry(attempt, None):
                    raise
                await self.retry_policy.wait(attempt)
                attempt += 1

    async def stream_infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: Optional[list[str]] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Streaming inference — yields token chunks as they arrive.

        Yields:
            dict chunks with keys:
                - delta: text token (intermediate chunks)
                - done: bool
                - finish_reason: str (final chunk only)
                - usage: dict (final chunk only)
                - performance: dict (final chunk only)
        """
        if not self.circuit_breaker.is_available:
            raise RuntimeError("Circuit breaker is OPEN — Anthropic API unavailable.")

        start_time = time.time()
        first_token_time: Optional[float] = None
        input_tokens = 0
        output_tokens = 0

        try:
            async with self.client.messages.stream(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                stop_sequences=stop_sequences or [],
            ) as stream:
                async for event in stream:
                    if event.type == "message_start":
                        if hasattr(event, "message") and hasattr(event.message, "usage"):
                            input_tokens = event.message.usage.input_tokens

                    elif event.type == "content_block_delta":
                        if first_token_time is None:
                            first_token_time = time.time()

                        delta_text = event.delta.text if hasattr(event.delta, "text") else ""
                        if delta_text:
                            output_tokens += 1  # Approximate — real count from final message
                            yield {
                                "delta": delta_text,
                                "done": False,
                                "finish_reason": "",
                            }

                    elif event.type == "message_delta":
                        if hasattr(event, "usage"):
                            output_tokens = event.usage.output_tokens

                    elif event.type == "message_stop":
                        pass

                # Final message with metrics
                total_latency_ms = int((time.time() - start_time) * 1000)
                ttft_ms = int((first_token_time - start_time) * 1000) if first_token_time else total_latency_ms

                self.circuit_breaker.record_success()

                yield {
                    "delta": "",
                    "done": True,
                    "finish_reason": "stop",
                    "usage": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "total_tokens": input_tokens + output_tokens,
                    },
                    "performance": {
                        "time_to_first_token_ms": ttft_ms,
                        "total_latency_ms": total_latency_ms,
                        "worker_id": settings.worker_id,
                    },
                }

        except (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError):
            self.circuit_breaker.record_failure()
            raise


def _extract_retry_after(error: Exception) -> Optional[float]:
    """Try to extract Retry-After value from error headers."""
    try:
        if hasattr(error, "response") and error.response:
            retry_after = error.response.headers.get("retry-after")
            if retry_after:
                return float(retry_after)
    except (ValueError, AttributeError):
        pass
    return None
