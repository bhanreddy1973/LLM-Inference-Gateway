"""FastAPI application entry point."""

from fastapi import FastAPI

from routers import auth

app = FastAPI(
    title="LLM Inference Gateway",
    description="Self-hostable API gateway for Anthropic Claude models",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Register routers
app.include_router(auth.router, prefix="/v1")


@app.get("/")
async def root():
    """Root endpoint — basic info."""
    return {
        "service": "llm-inference-gateway",
        "version": "0.1.0",
        "docs": "/docs",
    }
