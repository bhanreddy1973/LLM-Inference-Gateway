"""Worker configuration using pydantic-settings."""

from pydantic_settings import BaseSettings


class WorkerSettings(BaseSettings):
    """gRPC worker configuration loaded from environment variables."""

    # Anthropic
    anthropic_api_key: str = ""

    # gRPC
    grpc_port: int = 50051
    worker_id: str = "worker-1"

    # Retry settings
    max_retries: int = 3
    retry_base_delay: float = 1.0  # seconds
    retry_max_delay: float = 30.0  # seconds

    # Circuit breaker
    failure_threshold: int = 5
    recovery_timeout: float = 60.0  # seconds

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = WorkerSettings()
