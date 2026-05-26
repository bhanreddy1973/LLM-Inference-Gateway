"""Usage and analytics router — per-user stats from ClickHouse."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from dependencies import get_current_user_id
from services.analytics_service import AnalyticsService

router = APIRouter(tags=["usage"])

analytics = AnalyticsService()


@router.get(
    "/usage",
    summary="Get usage summary for current user",
)
async def get_usage(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to look back"),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Get aggregated usage stats for the authenticated user.

    Returns total requests, tokens, and estimated cost over the period.
    Requires JWT Bearer token.
    """
    return analytics.get_usage_summary(user_id=user_id, days=days)


@router.get(
    "/usage/analytics",
    summary="Detailed analytics with time-series data",
)
async def get_analytics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to look back"),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Get detailed analytics including daily breakdown, model usage, and recent requests.

    Requires JWT Bearer token.
    """
    return {
        "summary": analytics.get_usage_summary(user_id=user_id, days=days),
        "daily": analytics.get_daily_breakdown(user_id=user_id, days=days),
        "by_model": analytics.get_model_breakdown(user_id=user_id, days=days),
        "recent_requests": analytics.get_recent_requests(user_id=user_id, limit=20),
    }
