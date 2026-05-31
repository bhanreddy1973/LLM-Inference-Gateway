"""Usage and analytics router — per-user stats from ClickHouse."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from dependencies import get_current_user_id
from services.analytics_service import AnalyticsService

router = APIRouter(tags=["usage"])

analytics = AnalyticsService()


@router.get("/usage", summary="Get usage summary for current user")
async def get_usage(
    days: int = Query(default=30, ge=1, le=365),
    user_id: UUID = Depends(get_current_user_id),
):
    return analytics.get_usage_summary(user_id=user_id, days=days)


@router.get("/usage/analytics", summary="Detailed analytics with time-series data")
async def get_analytics(
    days: int = Query(default=30, ge=1, le=365),
    user_id: UUID = Depends(get_current_user_id),
):
    return {
        "summary": analytics.get_usage_summary(user_id=user_id, days=days),
        "daily": analytics.get_daily_breakdown(user_id=user_id, days=days),
        "by_model": analytics.get_model_breakdown(user_id=user_id, days=days),
        "recent_requests": analytics.get_recent_requests(user_id=user_id, limit=20),
    }


@router.get("/usage/logs", summary="Paginated, filterable request logs")
async def get_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    model: str = Query(default=None),
    status_code: int = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Paginated request log history with optional filters.
    Queries ClickHouse inference_logs directly.
    """
    result = analytics.get_logs(
        user_id=user_id,
        page=page,
        page_size=page_size,
        model_filter=model,
        status_filter=status_code,
        days=days,
    )
    return result
