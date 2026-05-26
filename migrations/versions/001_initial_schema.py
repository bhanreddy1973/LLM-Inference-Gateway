"""Initial schema — users, api_keys, usage_limits

Revision ID: 001
Revises: None
Create Date: 2026-05-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("tier", sa.String(20), nullable=False, server_default="free"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.CheckConstraint("tier IN ('free', 'pro', 'enterprise')", name="check_user_tier"),
    )
    op.create_index("idx_users_email", "users", ["email"])

    # API Keys table
    op.create_table(
        "api_keys",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("key_prefix", sa.String(12), nullable=False),
        sa.Column("name", sa.String(100), nullable=False, server_default="Default Key"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_api_keys_hash", "api_keys", ["key_hash"], postgresql_where=sa.text("is_active = true"))
    op.create_index("idx_api_keys_user", "api_keys", ["user_id"])

    # Usage Limits table
    op.create_table(
        "usage_limits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tier", sa.String(20), unique=True, nullable=False),
        sa.Column("requests_per_minute", sa.Integer(), nullable=False),
        sa.Column("requests_per_day", sa.Integer(), nullable=False),
        sa.Column("max_tokens_per_request", sa.Integer(), nullable=False, server_default="4096"),
        sa.Column("max_context_window", sa.Integer(), nullable=False, server_default="200000"),
    )

    # Seed tier limits
    op.execute("""
        INSERT INTO usage_limits (id, tier, requests_per_minute, requests_per_day, max_tokens_per_request, max_context_window) VALUES
            (gen_random_uuid(), 'free', 10, 100, 1024, 50000),
            (gen_random_uuid(), 'pro', 60, 5000, 4096, 200000),
            (gen_random_uuid(), 'enterprise', 300, -1, 8192, 200000);
    """)


def downgrade() -> None:
    op.drop_table("usage_limits")
    op.drop_table("api_keys")
    op.drop_table("users")
