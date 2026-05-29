"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# CORS — allow the dashboard (dev + container)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://dashboard:3000",
        "http://127.0.0.1:3000",
    ],
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
