"""Application configuration using pydantic-settings."""

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

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
