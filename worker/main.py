"""gRPC inference worker server entry point."""

import asyncio
import logging
import signal
from concurrent import futures

import grpc
from grpc import aio

from config import settings
from inference_handler import InferenceHandler

# Proto imports — generated from proto/inference.proto
# For now we define the servicer inline; stubs will be generated in build step
import inference_pb2
import inference_pb2_grpc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


class InferenceServicer(inference_pb2_grpc.InferenceServiceServicer):
    """gRPC servicer that handles inference requests."""

    def __init__(self):
        self.handler = InferenceHandler()
        self._active_connections = 0

    async def Infer(
        self,
        request: inference_pb2.InferenceRequest,
        context: grpc.aio.ServicerContext,
    ) -> inference_pb2.InferenceResponse:
        """Unary RPC — full response at once."""
        self._active_connections += 1
        try:
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]

            result = await self.handler.infer(
                model=request.model,
                messages=messages,
                max_tokens=request.max_tokens or 1024,
                temperature=request.temperature or 0.7,
                top_p=request.top_p or 1.0,
                stop_sequences=list(request.stop_sequences),
            )

            return inference_pb2.InferenceResponse(
                request_id=request.request_id,
                content=result["content"],
                finish_reason=result["finish_reason"],
                usage=inference_pb2.UsageMetrics(
                    input_tokens=result["usage"]["input_tokens"],
                    output_tokens=result["usage"]["output_tokens"],
                    total_tokens=result["usage"]["total_tokens"],
                ),
                performance=inference_pb2.PerformanceMetrics(
                    time_to_first_token_ms=result["performance"]["time_to_first_token_ms"],
                    total_latency_ms=result["performance"]["total_latency_ms"],
                    worker_id=result["performance"]["worker_id"],
                ),
            )

        except RuntimeError as e:
            # Circuit breaker open
            context.set_code(grpc.StatusCode.UNAVAILABLE)
            context.set_details(str(e))
            return inference_pb2.InferenceResponse()

        except Exception as e:
            logger.error(f"Inference error: {e}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Inference failed: {str(e)}")
            return inference_pb2.InferenceResponse()

        finally:
            self._active_connections -= 1

    async def StreamInfer(
        self,
        request: inference_pb2.InferenceRequest,
        context: grpc.aio.ServicerContext,
    ):
        """Server streaming RPC — token by token."""
        self._active_connections += 1
        try:
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]

            async for chunk in self.handler.stream_infer(
                model=request.model,
                messages=messages,
                max_tokens=request.max_tokens or 1024,
                temperature=request.temperature or 0.7,
                top_p=request.top_p or 1.0,
                stop_sequences=list(request.stop_sequences),
            ):
                stream_chunk = inference_pb2.StreamChunk(
                    request_id=request.request_id,
                    done=chunk["done"],
                    finish_reason=chunk.get("finish_reason", ""),
                )

                if chunk["done"]:
                    # Final chunk — send usage metrics
                    stream_chunk.usage.CopyFrom(
                        inference_pb2.UsageMetrics(
                            input_tokens=chunk["usage"]["input_tokens"],
                            output_tokens=chunk["usage"]["output_tokens"],
                            total_tokens=chunk["usage"]["total_tokens"],
                        )
                    )
                    stream_chunk.performance.CopyFrom(
                        inference_pb2.PerformanceMetrics(
                            time_to_first_token_ms=chunk["performance"]["time_to_first_token_ms"],
                            total_latency_ms=chunk["performance"]["total_latency_ms"],
                            worker_id=chunk["performance"]["worker_id"],
                        )
                    )
                else:
                    # Intermediate chunk — send text delta
                    stream_chunk.delta = chunk["delta"]

                yield stream_chunk

        except RuntimeError as e:
            context.set_code(grpc.StatusCode.UNAVAILABLE)
            context.set_details(str(e))

        except Exception as e:
            logger.error(f"Stream inference error: {e}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Stream inference failed: {str(e)}")

        finally:
            self._active_connections -= 1

    async def HealthCheck(
        self,
        request: inference_pb2.Empty,
        context: grpc.aio.ServicerContext,
    ) -> inference_pb2.HealthResponse:
        """Health check RPC."""
        return inference_pb2.HealthResponse(
            healthy=True,
            version="0.1.0",
            active_connections=self._active_connections,
        )


async def serve():
    """Start the gRPC server."""
    server = aio.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ("grpc.max_send_message_length", 50 * 1024 * 1024),  # 50MB
            ("grpc.max_receive_message_length", 50 * 1024 * 1024),
        ],
    )

    servicer = InferenceServicer()
    inference_pb2_grpc.add_InferenceServiceServicer_to_server(servicer, server)

    listen_addr = f"[::]:{settings.grpc_port}"
    server.add_insecure_port(listen_addr)

    logger.info(f"Starting gRPC worker on {listen_addr} (worker_id={settings.worker_id})")
    await server.start()

    # Graceful shutdown on SIGTERM/SIGINT
    loop = asyncio.get_event_loop()
    shutdown_event = asyncio.Event()

    def _signal_handler():
        logger.info("Shutdown signal received...")
        shutdown_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _signal_handler)

    await shutdown_event.wait()

    logger.info("Graceful shutdown — waiting for active requests...")
    await server.stop(grace=30)
    logger.info("Server stopped.")


if __name__ == "__main__":
    asyncio.run(serve())
