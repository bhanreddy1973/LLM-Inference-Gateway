"""FastAPI application entry point."""

import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from middleware.request_logger import request_logger
from routers import auth, chat, health, keys, models, usage


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle — startup and shutdown."""
    # Startup
    request_logger.start()
    yield
    # Shutdown
    await request_logger.shutdown()


app = FastAPI(
    title="LLM Inference Gateway",
    description="Self-hostable API gateway for Anthropic Claude models",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# Global exception handler — ensures errors return JSON (not HTML) with proper status
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

# CORS — allow frontend origins
cors_origins_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001",
)

if cors_origins_raw.strip() == "*":
    # Allow all origins (no credentials restriction)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in cors_origins_raw.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register routers
app.include_router(auth.router, prefix="/v1")
app.include_router(keys.router, prefix="/v1")
app.include_router(chat.router, prefix="/v1")
app.include_router(usage.router, prefix="/v1")
app.include_router(health.router, prefix="/v1")
app.include_router(models.router, prefix="/v1")


@app.get("/")
async def root():
    """Root endpoint — basic info."""
    return {
        "service": "llm-inference-gateway",
        "version": "0.1.0",
        "docs": "/docs",
    }
