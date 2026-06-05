"""Models router — list available models."""

from fastapi import APIRouter, Depends

from middleware.auth import RequestContext, validate_api_key

router = APIRouter(tags=["models"])


# Available models configuration
AVAILABLE_MODELS = [
    # Anthropic (direct)
    {
        "id": "claude-sonnet-4-20250514",
        "object": "model",
        "owned_by": "anthropic",
        "description": "Most intelligent model, highest capability",
        "context_window": 200000,
        "pricing": {"input": 3.0, "output": 15.0},
    },
    {
        "id": "claude-haiku-4-20250514",
        "object": "model",
        "owned_by": "anthropic",
        "description": "Fast and cost-effective for simpler tasks",
        "context_window": 200000,
        "pricing": {"input": 0.25, "output": 1.25},
    },
    # OpenRouter models
    {
        "id": "openai/gpt-4o",
        "object": "model",
        "owned_by": "openai",
        "description": "GPT-4o — fast multimodal model",
        "context_window": 128000,
        "pricing": {"input": 2.5, "output": 10.0},
    },
    {
        "id": "openai/gpt-4.1-mini",
        "object": "model",
        "owned_by": "openai",
        "description": "GPT-4.1 Mini — efficient and affordable",
        "context_window": 128000,
        "pricing": {"input": 0.4, "output": 1.6},
    },
    {
        "id": "google/gemini-2.5-pro-preview",
        "object": "model",
        "owned_by": "google",
        "description": "Gemini 2.5 Pro — advanced reasoning",
        "context_window": 1000000,
        "pricing": {"input": 1.25, "output": 10.0},
    },
    {
        "id": "meta-llama/llama-4-maverick:free",
        "object": "model",
        "owned_by": "meta",
        "description": "Llama 4 Maverick — open-source, free tier",
        "context_window": 128000,
        "pricing": {"input": 0.0, "output": 0.0},
    },
    {
        "id": "deepseek/deepseek-chat-v3-0324:free",
        "object": "model",
        "owned_by": "deepseek",
        "description": "DeepSeek V3 — strong coding model, free tier",
        "context_window": 128000,
        "pricing": {"input": 0.0, "output": 0.0},
    },
    {
        "id": "mistralai/mistral-large-latest",
        "object": "model",
        "owned_by": "mistral",
        "description": "Mistral Large — powerful European LLM",
        "context_window": 128000,
        "pricing": {"input": 2.0, "output": 6.0},
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

    Includes pricing in USD per million tokens.
    Requires X-API-Key header.
    """
    return {
        "object": "list",
        "data": AVAILABLE_MODELS,
    }
