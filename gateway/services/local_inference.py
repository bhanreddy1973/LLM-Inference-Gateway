"""Local inference client — runs the worker in-process (no gRPC needed).

Used for single-process deployments (e.g., Render free tier) where
the gateway and worker run in the same Python process.

Falls back to gRPC when GRPC_WORKER_HOST is set to a remote host.
"""

import os
import sys
import time
import uuid
from typing import AsyncGenerator

# Add worker directory to path for imports
WORKER_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "worker")
if os.path.exists(WORKER_DIR):
    sys.path.insert(0, WORKER_DIR)


class LocalInferenceClient:
    """Direct in-process inference without gRPC overhead."""

    def __init__(self):
        self._handler = None

    def _get_handler(self):
        if self._handler is None:
            from inference_handler import InferenceHandler
            self._handler = InferenceHandler()
        return self._handler

    async def infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: list[str] = None,
    ) -> dict:
        handler = self._get_handler()
        result = await handler.infer(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stop_sequences=stop_sequences,
        )
        result["request_id"] = str(uuid.uuid4())
        return result

    async def stream_infer(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 1024,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop_sequences: list[str] = None,
    ) -> AsyncGenerator[dict, None]:
        handler = self._get_handler()
        async for chunk in handler.stream_infer(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stop_sequences=stop_sequences,
        ):
            chunk["request_id"] = str(uuid.uuid4())
            yield chunk

    async def health_check(self) -> dict:
        return {"healthy": True, "version": "0.1.0", "active_connections": 0}

    async def close(self):
        pass
