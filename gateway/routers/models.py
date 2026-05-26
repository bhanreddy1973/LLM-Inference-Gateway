"""Models router — list available models."""

from fastapi import APIRouter, Depends

from middleware.auth import RequestContext, validate_api_key

router = APIRouter(tags=["models"])


# Available models configuration
AVAILABLE_MODELS = [
    {
        "id": "claude-sonnet-4-20250514",
        "object": "model",
        "owned_by": "anthropic",
        "description": "Most intelligent model, highest capability",
    },
    {
        "id": "claude-haiku-4-20250514",
        "object": "model",
        "owned_by": "anthropic",
        "description": "Fast and cost-effective for simpler tasks",
    },
]


@router.get(
    "/models",
    summary="List available models",
)
async def list_models(
    ctx: RequestContext = Depends(validate_api_key),
):
    """
    List all available models for inference.

    Requires X-API-Key header.
    """
    return {
        "object": "list",
        "data": AVAILABLE_MODELS,
    }
