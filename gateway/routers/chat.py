"""Chat router — inference endpoints with streaming support."""

import json
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from middleware.auth import RequestContext, validate_api_key
from middleware.rate_limiter import rate_limiter
from middleware.request_logger import request_logger
from models.schemas import (
    ChatChoice,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ErrorDetail,
    ErrorResponse,
    UsageInfo,
)
from services.inference_client import inference_client

router = APIRouter(tags=["chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat completion (non-streaming)",
    responses={429: {"model": ErrorResponse}},
)
async def chat_completion(
    request: ChatRequest,
    ctx: RequestContext = Depends(validate_api_key),
):
    """
    Send a chat completion request to Claude.

    Requires X-API-Key header. Subject to rate limiting based on tier.
    """
    # Rate limit check
    rl_result = await rate_limiter.check(
        user_id=str(ctx.user_id),
        requests_per_minute=ctx.requests_per_minute,
        requests_per_day=ctx.requests_per_day,
    )

    if not rl_result.allowed:
        retry_after = max(1, rl_result.reset_at - int(time.time()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "type": "rate_limit_exceeded",
                    "message": f"Rate limit exceeded. Retry after {retry_after} seconds.",
                    "retry_after": retry_after,
                }
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(rl_result.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(rl_result.reset_at),
            },
        )

    # Enforce max tokens per tier
    max_tokens = min(request.max_tokens, ctx.max_tokens_per_request)

    # Call worker via gRPC
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        result = await inference_client.infer(
            model=request.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=request.temperature,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Inference worker error: {str(e)}",
        )

    # Build response
    completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"

    # Log request to ClickHouse (async, non-blocking)
    await request_logger.log(
        request_id=uuid.UUID(completion_id.replace("chatcmpl-", "").ljust(32, "0")),
        user_id=ctx.user_id,
        api_key_prefix=ctx.key_prefix,
        model=request.model,
        input_tokens=result["usage"]["input_tokens"],
        output_tokens=result["usage"]["output_tokens"],
        total_tokens=result["usage"]["total_tokens"],
        max_tokens=max_tokens,
        temperature=request.temperature,
        stream=False,
        time_to_first_token_ms=result["performance"]["time_to_first_token_ms"],
        total_latency_ms=result["performance"]["total_latency_ms"],
        worker_id=result["performance"]["worker_id"],
        status_code=200,
        finish_reason=result["finish_reason"],
    )

    return ChatResponse(
        id=completion_id,
        created=int(time.time()),
        model=request.model,
        choices=[
            ChatChoice(
                index=0,
                message=ChatMessage(role="assistant", content=result["content"]),
                finish_reason=result["finish_reason"],
            )
        ],
        usage=UsageInfo(
            prompt_tokens=result["usage"]["input_tokens"],
            completion_tokens=result["usage"]["output_tokens"],
            total_tokens=result["usage"]["total_tokens"],
        ),
    )


@router.post(
    "/chat/stream",
    summary="Chat completion (SSE streaming)",
    responses={429: {"model": ErrorResponse}},
)
async def chat_stream(
    request: ChatRequest,
    ctx: RequestContext = Depends(validate_api_key),
):
    """
    Stream chat completion tokens via Server-Sent Events.

    Response format is OpenAI-compatible.
    Requires X-API-Key header. Subject to rate limiting based on tier.
    """
    # Rate limit check
    rl_result = await rate_limiter.check(
        user_id=str(ctx.user_id),
        requests_per_minute=ctx.requests_per_minute,
        requests_per_day=ctx.requests_per_day,
    )

    if not rl_result.allowed:
        retry_after = max(1, rl_result.reset_at - int(time.time()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "type": "rate_limit_exceeded",
                    "message": f"Rate limit exceeded. Retry after {retry_after} seconds.",
                    "retry_after": retry_after,
                }
            },
            headers={"Retry-After": str(retry_after)},
        )

    max_tokens = min(request.max_tokens, ctx.max_tokens_per_request)
    completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    async def event_generator():
        """Generate SSE events from gRPC stream."""
        try:
            async for chunk in inference_client.stream_infer(
                model=request.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=request.temperature,
            ):
                if chunk["done"]:
                    # Log to ClickHouse
                    await request_logger.log(
                        request_id=uuid.uuid4(),
                        user_id=ctx.user_id,
                        api_key_prefix=ctx.key_prefix,
                        model=request.model,
                        input_tokens=chunk["usage"]["input_tokens"],
                        output_tokens=chunk["usage"]["output_tokens"],
                        total_tokens=chunk["usage"]["total_tokens"],
                        max_tokens=max_tokens,
                        temperature=request.temperature,
                        stream=True,
                        time_to_first_token_ms=chunk["performance"]["time_to_first_token_ms"],
                        total_latency_ms=chunk["performance"]["total_latency_ms"],
                        worker_id=chunk["performance"]["worker_id"],
                        status_code=200,
                        finish_reason="stop",
                    )

                    # Final chunk with usage
                    data = {
                        "id": completion_id,
                        "object": "chat.completion.chunk",
                        "choices": [{
                            "index": 0,
                            "delta": {},
                            "finish_reason": "stop",
                        }],
                        "usage": {
                            "prompt_tokens": chunk["usage"]["input_tokens"],
                            "completion_tokens": chunk["usage"]["output_tokens"],
                            "total_tokens": chunk["usage"]["total_tokens"],
                        },
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    yield "data: [DONE]\n\n"
                else:
                    # Intermediate chunk with text delta
                    data = {
                        "id": completion_id,
                        "object": "chat.completion.chunk",
                        "choices": [{
                            "index": 0,
                            "delta": {"content": chunk["delta"]},
                            "finish_reason": None,
                        }],
                    }
                    yield f"data: {json.dumps(data)}\n\n"

        except Exception as e:
            error_data = {"error": {"type": "stream_error", "message": str(e)}}
            yield f"data: {json.dumps(error_data)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-RateLimit-Limit": str(rl_result.limit),
            "X-RateLimit-Remaining": str(rl_result.remaining),
            "X-RateLimit-Reset": str(rl_result.reset_at),
        },
    )
