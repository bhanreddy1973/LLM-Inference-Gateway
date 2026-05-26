"""Health check router — liveness and readiness probes."""

import redis.asyncio as redis
from fastapi import APIRouter
from sqlalchemy import text

from config import settings
from dependencies import async_session
from services.inference_client import inference_client

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Liveness probe",
)
async def health():
    """
    Basic liveness check — returns 200 if the gateway process is running.

    Use this for container orchestration liveness probes.
    """
    return {"status": "healthy", "service": "llm-inference-gateway", "version": "0.1.0"}


@router.get(
    "/health/ready",
    summary="Readiness probe — checks all dependencies",
)
async def readiness():
    """
    Deep readiness check — verifies connectivity to all backend services.

    Returns 200 only if PostgreSQL, Redis, and the gRPC worker are reachable.
    Use this for load balancer readiness probes.
    """
    checks = {}

    # PostgreSQL
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"] = {"status": "healthy"}
    except Exception as e:
        checks["postgres"] = {"status": "unhealthy", "error": str(e)}

    # Redis
    try:
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
        await redis_client.ping()
        await redis_client.aclose()
        checks["redis"] = {"status": "healthy"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}

    # gRPC Worker
    try:
        worker_health = await inference_client.health_check()
        if worker_health.get("healthy"):
            checks["worker"] = {"status": "healthy", "version": worker_health.get("version")}
        else:
            checks["worker"] = {"status": "unhealthy"}
    except Exception as e:
        checks["worker"] = {"status": "unhealthy", "error": str(e)}

    # Overall status
    all_healthy = all(c["status"] == "healthy" for c in checks.values())
    status_code = 200 if all_healthy else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks,
        },
    )
