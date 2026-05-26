"""gRPC client for communicating with inference workers."""

import uuid
from typing import AsyncGenerator

import grpc
from grpc import aio

from config import settings

# Generated proto stubs
import inference_pb2
import inference_pb2_grpc


class InferenceClient:
    """
    gRPC client that routes requests to inference workers.

    Maintains a persistent channel with connection pooling.
    """

    def __init__(self):
        self._channel: aio.Channel = None

    async def _get_channel(self) -> aio.Channel:
        """Lazy-init the gRPC channel."""
        if self._channel is None:
            target = f"{settings.grpc_worker_host}:{settings.grpc_worker_port}"
            self._channel = aio.insecure_channel(
                target,
                options=[
                    ("grpc.max_send_message_length", 50 * 1024 * 1024),
                    ("grpc.max_receive_message_length", 50 * 1024 * 1024),
                    ("grpc.keepalive_time_ms", 30000),
                    ("grpc.keepalive_timeout_ms", 10000),
                ],
            )
        return self._channel

    async def infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: list[str] = None,
    ) -> dict:
        """
        Send a unary inference request to the worker.

        Returns:
            dict with content, finish_reason, usage, performance
        """
        channel = await self._get_channel()
        stub = inference_pb2_grpc.InferenceServiceStub(channel)

        request = inference_pb2.InferenceRequest(
            request_id=str(uuid.uuid4()),
            model=model,
            messages=[
                inference_pb2.Message(role=m["role"], content=m["content"])
                for m in messages
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stop_sequences=stop_sequences or [],
        )

        response = await stub.Infer(request)

        return {
            "request_id": response.request_id,
            "content": response.content,
            "finish_reason": response.finish_reason,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.total_tokens,
            },
            "performance": {
                "time_to_first_token_ms": response.performance.time_to_first_token_ms,
                "total_latency_ms": response.performance.total_latency_ms,
                "worker_id": response.performance.worker_id,
            },
        }

    async def stream_infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: list[str] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Send a streaming inference request to the worker.

        Yields:
            dict chunks with delta, done, finish_reason, usage, performance
        """
        channel = await self._get_channel()
        stub = inference_pb2_grpc.InferenceServiceStub(channel)

        request = inference_pb2.InferenceRequest(
            request_id=str(uuid.uuid4()),
            model=model,
            messages=[
                inference_pb2.Message(role=m["role"], content=m["content"])
                for m in messages
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stop_sequences=stop_sequences or [],
        )

        async for chunk in stub.StreamInfer(request):
            result = {
                "request_id": chunk.request_id,
                "done": chunk.done,
                "finish_reason": chunk.finish_reason,
            }

            if chunk.done:
                result["usage"] = {
                    "input_tokens": chunk.usage.input_tokens,
                    "output_tokens": chunk.usage.output_tokens,
                    "total_tokens": chunk.usage.total_tokens,
                }
                result["performance"] = {
                    "time_to_first_token_ms": chunk.performance.time_to_first_token_ms,
                    "total_latency_ms": chunk.performance.total_latency_ms,
                    "worker_id": chunk.performance.worker_id,
                }
            else:
                result["delta"] = chunk.delta

            yield result

    async def health_check(self) -> dict:
        """Check worker health via gRPC."""
        channel = await self._get_channel()
        stub = inference_pb2_grpc.InferenceServiceStub(channel)
        response = await stub.HealthCheck(inference_pb2.Empty())
        return {
            "healthy": response.healthy,
            "version": response.version,
            "active_connections": response.active_connections,
        }

    async def close(self):
        """Close the gRPC channel."""
        if self._channel:
            await self._channel.close()
            self._channel = None


# Singleton instance
inference_client = InferenceClient()
