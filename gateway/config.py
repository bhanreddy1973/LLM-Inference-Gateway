"""Application configuration using pydantic-settings."""

from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Gateway configuration loaded from environment variables."""

    # PostgreSQL
    database_url: str = "postgresql+asyncpg://gateway:gateway@localhost:5432/inference_gw"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # ClickHouse
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 30

    # gRPC Worker
    grpc_worker_host: str = "localhost"
    grpc_worker_port: int = 50051

    # OAuth — Google
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None

    # OAuth — GitHub
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None

    # Frontend URL (for OAuth redirect callbacks)
    frontend_url: str = "http://localhost:3000"

    # SMTP — for password reset emails
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: str = "noreply@acheron.dev"
    smtp_use_tls: bool = True

    # Password reset token expiry (minutes)
    password_reset_expiry_minutes: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
