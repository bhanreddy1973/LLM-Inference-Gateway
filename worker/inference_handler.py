"""Multi-provider inference handler with Anthropic (native) and OpenRouter (OpenAI SDK) support."""

import time
from typing import AsyncGenerator, Optional

import anthropic
import openai

from circuit_breaker import CircuitBreaker
from config import settings
from retry import RetryPolicy

# Models routed to Anthropic directly (native SDK)
ANTHROPIC_MODELS = {"claude-sonnet-4-20250514", "claude-haiku-4-20250514", "claude-opus-4-20250514"}


def _is_anthropic_model(model: str) -> bool:
    """Check if a model should be routed via native Anthropic SDK."""
    return model in ANTHROPIC_MODELS or model.startswith("claude-")


class InferenceHandler:
    """
    Handles inference requests via two routes:
      1. Anthropic SDK — for Claude models (direct)
      2. OpenAI SDK via OpenRouter — for everything else (GPT, Gemini, Llama, Mistral, etc.)

    Features:
        - Streaming token-by-token responses
        - Exponential backoff retry on transient failures
        - Circuit breaker to avoid hammering a failing API
        - Metrics collection (tokens, latency, TTFT)
    """

    def __init__(self):
        # Anthropic native client
        self.anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

        # OpenRouter client (OpenAI-compatible)
        self.openrouter_client = openai.AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers={
                "HTTP-Referer": "https://llm-inference-gateway.local",
                "X-Title": "LLM Inference Gateway",
            },
        )

        # Disable SSL verification if behind corporate proxy
        if settings.openrouter_disable_ssl_verify:
            import httpx
            self.openrouter_client = openai.AsyncOpenAI(
                api_key=settings.openrouter_api_key,
                base_url=settings.openrouter_base_url,
                default_headers={
                    "HTTP-Referer": "https://llm-inference-gateway.local",
                    "X-Title": "LLM Inference Gateway",
                },
                http_client=httpx.AsyncClient(verify=False),
            )

        self.circuit_breaker = CircuitBreaker(
            failure_threshold=settings.failure_threshold,
            recovery_timeout=settings.recovery_timeout,
        )
        self.retry_policy = RetryPolicy(
            max_retries=settings.max_retries,
            base_delay=settings.retry_base_delay,
            max_delay=settings.retry_max_delay,
        )

    # ─── Unified entry points ──────────────────────────────────────────────────

    async def infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: Optional[list[str]] = None,
    ) -> dict:
        """Non-streaming inference — routes to Anthropic or OpenRouter based on model."""
        if _is_anthropic_model(model):
            return await self._infer_anthropic(model, messages, max_tokens, temperature, top_p, stop_sequences)
        return await self._infer_openrouter(model, messages, max_tokens, temperature, top_p, stop_sequences)

    async def stream_infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: Optional[list[str]] = None,
    ) -> AsyncGenerator[dict, None]:
        """Streaming inference — routes to Anthropic or OpenRouter based on model."""
        if _is_anthropic_model(model):
            async for chunk in self._stream_anthropic(model, messages, max_tokens, temperature, top_p, stop_sequences):
                yield chunk
        else:
            async for chunk in self._stream_openrouter(model, messages, max_tokens, temperature, top_p, stop_sequences):
                yield chunk

    # ─── Anthropic (native SDK) ────────────────────────────────────────────────

    async def _infer_anthropic(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        top_p: float,
        stop_sequences: Optional[list[str]],
    ) -> dict:
        if not self.circuit_breaker.is_available:
            raise RuntimeError("Circuit breaker is OPEN — Anthropic API unavailable.")

        start_time = time.time()
        attempt = 0

        while True:
            try:
                response = await self.anthropic_client.messages.create(
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
                        "time_to_first_token_ms": total_latency_ms,
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

            except anthropic.InternalServerError:
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

    async def _stream_anthropic(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        top_p: float,
        stop_sequences: Optional[list[str]],
    ) -> AsyncGenerator[dict, None]:
        if not self.circuit_breaker.is_available:
            raise RuntimeError("Circuit breaker is OPEN — Anthropic API unavailable.")

        start_time = time.time()
        first_token_time: Optional[float] = None
        input_tokens = 0
        output_tokens = 0

        try:
            async with self.anthropic_client.messages.stream(
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
                            output_tokens += 1
                            yield {"delta": delta_text, "done": False, "finish_reason": ""}

                    elif event.type == "message_delta":
                        if hasattr(event, "usage"):
                            output_tokens = event.usage.output_tokens

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

    # ─── OpenRouter (OpenAI SDK) ───────────────────────────────────────────────

    async def _infer_openrouter(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        top_p: float,
        stop_sequences: Optional[list[str]],
    ) -> dict:
        if not self.circuit_breaker.is_available:
            raise RuntimeError("Circuit breaker is OPEN — OpenRouter API unavailable.")

        start_time = time.time()
        attempt = 0

        while True:
            try:
                response = await self.openrouter_client.chat.completions.create(
                    model=model,
                    messages=[{"role": m["role"], "content": m["content"]} for m in messages],
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    stop=stop_sequences or None,
                )

                self.circuit_breaker.record_success()
                total_latency_ms = int((time.time() - start_time) * 1000)

                choice = response.choices[0] if response.choices else None
                content = choice.message.content if choice and choice.message else ""
                finish_reason = choice.finish_reason if choice else "stop"

                usage = response.usage
                input_tokens = usage.prompt_tokens if usage else 0
                output_tokens = usage.completion_tokens if usage else 0

                return {
                    "content": content or "",
                    "finish_reason": finish_reason or "stop",
                    "usage": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "total_tokens": input_tokens + output_tokens,
                    },
                    "performance": {
                        "time_to_first_token_ms": total_latency_ms,
                        "total_latency_ms": total_latency_ms,
                        "worker_id": settings.worker_id,
                    },
                }

            except openai.RateLimitError:
                self.circuit_breaker.record_failure()
                if not self.retry_policy.should_retry(attempt, 429):
                    raise
                await self.retry_policy.wait(attempt)
                attempt += 1

            except openai.InternalServerError:
                self.circuit_breaker.record_failure()
                if not self.retry_policy.should_retry(attempt, 500):
                    raise
                await self.retry_policy.wait(attempt)
                attempt += 1

            except openai.APIConnectionError:
                self.circuit_breaker.record_failure()
                if not self.retry_policy.should_retry(attempt, None):
                    raise
                await self.retry_policy.wait(attempt)
                attempt += 1

    async def _stream_openrouter(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        top_p: float,
        stop_sequences: Optional[list[str]],
    ) -> AsyncGenerator[dict, None]:
        if not self.circuit_breaker.is_available:
            raise RuntimeError("Circuit breaker is OPEN — OpenRouter API unavailable.")

        start_time = time.time()
        first_token_time: Optional[float] = None
        output_tokens = 0

        try:
            stream = await self.openrouter_client.chat.completions.create(
                model=model,
                messages=[{"role": m["role"], "content": m["content"]} for m in messages],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                stop=stop_sequences or None,
                stream=True,
                stream_options={"include_usage": True},
            )

            input_tokens = 0
            finish_reason = "stop"

            async for chunk in stream:
                # Usage info (final chunk from OpenRouter)
                if chunk.usage:
                    input_tokens = chunk.usage.prompt_tokens or 0
                    output_tokens = chunk.usage.completion_tokens or 0

                if chunk.choices:
                    choice = chunk.choices[0]
                    delta = choice.delta

                    if choice.finish_reason:
                        finish_reason = choice.finish_reason

                    if delta and delta.content:
                        if first_token_time is None:
                            first_token_time = time.time()
                        output_tokens += 1
                        yield {"delta": delta.content, "done": False, "finish_reason": ""}

            total_latency_ms = int((time.time() - start_time) * 1000)
            ttft_ms = int((first_token_time - start_time) * 1000) if first_token_time else total_latency_ms
            self.circuit_breaker.record_success()

            yield {
                "delta": "",
                "done": True,
                "finish_reason": finish_reason,
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

        except (openai.RateLimitError, openai.InternalServerError, openai.APIConnectionError):
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
