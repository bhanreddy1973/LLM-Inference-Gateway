"""Analytics service — queries ClickHouse for usage stats and time-series data."""

from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import clickhouse_connect

from config import settings


class AnalyticsService:
    """
    Queries ClickHouse for per-user analytics and usage stats.

    Uses the inference_logs table and user_usage_daily materialized view.
    """

    def __init__(self):
        self._client = None

    def _get_client(self):
        """Lazy-init ClickHouse client."""
        if self._client is None:
            self._client = clickhouse_connect.get_client(
                host=settings.clickhouse_host,
                port=settings.clickhouse_port,
            )
        return self._client

    def get_usage_summary(self, user_id: UUID, days: int = 30) -> dict:
        """
        Get usage summary for a user over the last N days.

        Returns:
            dict with total_requests, total_tokens, total_cost, models breakdown
        """
        client = self._get_client()
        since = date.today() - timedelta(days=days)

        result = client.query(
            """
            SELECT
                sum(request_count) AS total_requests,
                sum(total_input_tokens) AS total_input_tokens,
                sum(total_output_tokens) AS total_output_tokens,
                sum(total_cost) AS total_cost
            FROM user_usage_daily
            WHERE user_id = %(user_id)s AND day >= %(since)s
            """,
            parameters={"user_id": str(user_id), "since": since.isoformat()},
        )

        row = result.first_row if result.row_count > 0 else (0, 0, 0, 0.0)

        return {
            "total_requests": int(row[0] or 0),
            "total_input_tokens": int(row[1] or 0),
            "total_output_tokens": int(row[2] or 0),
            "total_cost_usd": round(float(row[3] or 0), 6),
            "period_days": days,
        }

    def get_daily_breakdown(self, user_id: UUID, days: int = 30) -> list[dict]:
        """
        Get daily usage breakdown for time-series charts.

        Returns:
            List of dicts with day, request_count, tokens, cost, avg_latency
        """
        client = self._get_client()
        since = date.today() - timedelta(days=days)

        result = client.query(
            """
            SELECT
                day,
                sum(request_count) AS requests,
                sum(total_input_tokens + total_output_tokens) AS total_tokens,
                sum(total_cost) AS cost,
                avg(avg_latency_ms) AS avg_latency_ms
            FROM user_usage_daily
            WHERE user_id = %(user_id)s AND day >= %(since)s
            GROUP BY day
            ORDER BY day ASC
            """,
            parameters={"user_id": str(user_id), "since": since.isoformat()},
        )

        return [
            {
                "day": str(row[0]),
                "requests": int(row[1]),
                "total_tokens": int(row[2]),
                "cost_usd": round(float(row[3]), 6),
                "avg_latency_ms": int(row[4]) if row[4] else 0,
            }
            for row in result.result_rows
        ]

    def get_model_breakdown(self, user_id: UUID, days: int = 30) -> list[dict]:
        """Get usage broken down by model."""
        client = self._get_client()
        since = date.today() - timedelta(days=days)

        result = client.query(
            """
            SELECT
                model,
                sum(request_count) AS requests,
                sum(total_input_tokens) AS input_tokens,
                sum(total_output_tokens) AS output_tokens,
                sum(total_cost) AS cost
            FROM user_usage_daily
            WHERE user_id = %(user_id)s AND day >= %(since)s
            GROUP BY model
            ORDER BY requests DESC
            """,
            parameters={"user_id": str(user_id), "since": since.isoformat()},
        )

        return [
            {
                "model": row[0],
                "requests": int(row[1]),
                "input_tokens": int(row[2]),
                "output_tokens": int(row[3]),
                "cost_usd": round(float(row[4]), 6),
            }
            for row in result.result_rows
        ]

    def get_realtime_stats(self, user_id: UUID, limit: int = 50) -> dict:
        """Get live request feed + throughput metrics for the monitoring page."""
        client = self._get_client()
        now = datetime.now(timezone.utc)

        recent = client.query(
            """
            SELECT
                request_id, model, input_tokens, output_tokens,
                total_tokens, time_to_first_token_ms, total_latency_ms,
                status_code, finish_reason, created_at, estimated_cost_usd
            FROM inference_logs
            WHERE user_id = %(user_id)s
            ORDER BY created_at DESC
            LIMIT %(limit)s
            """,
            parameters={"user_id": str(user_id), "limit": limit},
        )

        requests_list = [
            {
                "request_id": str(r[0]),
                "model": r[1],
                "input_tokens": r[2],
                "output_tokens": r[3],
                "total_tokens": r[4],
                "time_to_first_token_ms": r[5],
                "total_latency_ms": r[6],
                "status_code": r[7],
                "finish_reason": r[8],
                "created_at": str(r[9]),
                "estimated_cost_usd": round(float(r[10] or 0), 6),
            }
            for r in recent.result_rows
        ]

        t1m = (now - timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S")
        t5m = (now - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
        t1h = (now - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")

        def _count(since: str) -> int:
            r = client.query(
                "SELECT count() FROM inference_logs WHERE user_id=%(u)s AND created_at >= %(s)s",
                parameters={"u": str(user_id), "s": since},
            )
            return int(r.first_row[0]) if r.row_count else 0

        def _error_rate(since: str) -> float:
            r = client.query(
                "SELECT countIf(status_code>=400), count() FROM inference_logs WHERE user_id=%(u)s AND created_at>=%(s)s",
                parameters={"u": str(user_id), "s": since},
            )
            if r.row_count and r.first_row[1]:
                return round(r.first_row[0] / r.first_row[1], 4)
            return 0.0

        return {
            "requests": requests_list,
            "throughput_1m": _count(t1m),
            "throughput_5m": _count(t5m),
            "error_rate_1h": _error_rate(t1h),
        }

    def get_hourly_breakdown(self, user_id: UUID) -> list[dict]:
        """Get last 24h hourly breakdown for the monitoring throughput chart."""
        client = self._get_client()
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")

        result = client.query(
            """
            SELECT
                toStartOfHour(created_at) AS hour,
                count() AS requests,
                avg(total_latency_ms) AS avg_latency_ms,
                countIf(status_code >= 400) AS error_count
            FROM inference_logs
            WHERE user_id = %(user_id)s AND created_at >= %(since)s
            GROUP BY hour
            ORDER BY hour ASC
            """,
            parameters={"user_id": str(user_id), "since": since},
        )

        return [
            {
                "hour": str(row[0]),
                "requests": int(row[1]),
                "avg_latency_ms": round(float(row[2] or 0), 1),
                "error_count": int(row[3]),
            }
            for row in result.result_rows
        ]

    def get_recent_requests(
        self, user_id: UUID, limit: int = 20
    ) -> list[dict]:
        """Get most recent requests for a user."""
        client = self._get_client()

        result = client.query(
            """
            SELECT
                request_id,
                model,
                input_tokens,
                output_tokens,
                total_latency_ms,
                status_code,
                finish_reason,
                created_at
            FROM inference_logs
            WHERE user_id = %(user_id)s
            ORDER BY created_at DESC
            LIMIT %(limit)s
            """,
            parameters={"user_id": str(user_id), "limit": limit},
        )

        return [
            {
                "request_id": str(row[0]),
                "model": row[1],
                "input_tokens": row[2],
                "output_tokens": row[3],
                "total_latency_ms": row[4],
                "status_code": row[5],
                "finish_reason": row[6],
                "created_at": str(row[7]),
            }
            for row in result.result_rows
        ]
