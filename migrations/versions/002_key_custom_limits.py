"""Migration 002 — per-key custom rate limits

Adds nullable limit overrides to api_keys table.
When set, these override the user's tier-level limits.
When NULL, the tier default is used.

Revision ID: 002
Revises: 001
Create Date: 2026-05-31
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add custom limit columns to api_keys (all nullable — NULL means "use tier default")
    op.add_column("api_keys", sa.Column("requests_per_minute", sa.Integer(), nullable=True))
    op.add_column("api_keys", sa.Column("requests_per_day", sa.Integer(), nullable=True))
    op.add_column("api_keys", sa.Column("max_tokens_per_request", sa.Integer(), nullable=True))

    # Drop the hardcoded tier CHECK constraint so tier can be any string
    # (allows future custom tier names without a migration)
    op.drop_constraint("check_user_tier", "users", type_="check")


def downgrade() -> None:
    op.drop_column("api_keys", "requests_per_minute")
    op.drop_column("api_keys", "requests_per_day")
    op.drop_column("api_keys", "max_tokens_per_request")
    op.create_check_constraint(
        "check_user_tier", "users",
        "tier IN ('free', 'pro', 'enterprise')"
    )
