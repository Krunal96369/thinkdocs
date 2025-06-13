"""
Configuration management for ThinkDocs API.
Supports multiple environments with validation and secret management.
Optimized for free deployment and student use.
"""

import os
from functools import lru_cache
from typing import List, Optional, Literal

from pydantic import Field, validator, AliasChoices
from pydantic_settings import BaseSettings


class DatabaseSettings(BaseSettings):
    """Database configuration settings."""

    database_url: str = Field(
        default="postgresql+asyncpg://thinkdocs:dev_password@postgres:5432/thinkdocs",
        description="PostgreSQL database URL (async)"
    )
    pool_size: int = Field(default=5, description="Connection pool size (reduced for students)")
    max_overflow: int = Field(default=10, description="Max connection overflow")
    pool_timeout: int = Field(default=30, description="Pool timeout in seconds")
    pool_recycle: int = Field(default=3600, description="Pool recycle time in seconds")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


class RedisSettings(BaseSettings):
    """Redis configuration settings."""

    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    redis_max_connections: int = Field(default=10, description="Max Redis connections (reduced)")
    redis_socket_timeout: int = Field(default=5, description="Redis socket timeout")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


class VectorDBSettings(BaseSettings):
    """Vector database configuration (ChromaDB or Weaviate)."""

    vector_db_type: Literal["chromadb", "weaviate"] = Field(
        default="chromadb",
        description="Vector database type (chromadb for free, weaviate for production)"
    )

    # ChromaDB settings (Free)
    chromadb_host: str = Field(default="localhost", description="ChromaDB host")
    chromadb_port: int = Field(default=8000, description="ChromaDB port")
    chromadb_persist_directory: str = Field(
        default="./storage/chromadb",
        description="ChromaDB persistence directory"
    )

    # Weaviate settings (Production)
    weaviate_url: str = Field(
        default="http://localhost:8080",
        description="Weaviate instance URL"
    )
    weaviate_api_key: Optional[str] = Field(
        default=None,
        description="Weaviate API key for authentication"
    )
    default_class_name: str = Field(
        default="Document",
        description="Default vector class name"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

    @property
    def vector_db_url(self) -> str:
        """Get the appropriate vector DB URL based on type."""
        if self.vector_db_type == "chromadb":
            return f"http://{self.chromadb_host}:{self.chromadb_port}"
        else:
            return self.weaviate_url


class CelerySettings(BaseSettings):
    """Celery task queue settings."""

    broker_url: str = Field(
        default="redis://localhost:6379/0",
        description="Celery broker URL"
    )
    result_backend: str = Field(
        default="redis://localhost:6379/0",
        description="Celery result backend URL"
    )
    task_serializer: str = Field(default="json", description="Task serialization format")
    result_serializer: str = Field(default="json", description="Result serialization format")
    timezone: str = Field(default="UTC", description="Celery timezone")
    enable_utc: bool = Field(default=True, description="Enable UTC timestamps")
    worker_concurrency: int = Field(default=2, description="Worker concurrency (reduced for students)")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


class SecuritySettings(BaseSettings):
    """Security and authentication settings."""

    secret_key: str = Field(
        default="dev-secret-key-change-in-production-32-chars-minimum",
        description="JWT secret key for token signing"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30,
        description="Access token expiration in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=7,
        description="Refresh token expiration in days"
    )
    password_min_length: int = Field(default=8, description="Minimum password length")
    max_login_attempts: int = Field(default=5, description="Max failed login attempts")
    lockout_duration_minutes: int = Field(
        default=15,
        description="Account lockout duration in minutes"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


class LLMSettings(BaseSettings):
    """Large Language Model configuration."""

    # LLM Provider
    provider: Literal["gemini", "openai", "local"] = Field(
        default="gemini",
        description="LLM provider (gemini for free, openai for paid, local for self-hosted)"
    )

    # Gemini Settings (Free)
    gemini_api_key: Optional[str] = Field(
        default=None,
        description="Google Gemini API key (free tier available)"
    )
    gemini_model: str = Field(
        default="gemini-1.5-flash",
        description="Gemini model name (gemini-1.5-flash is free and fast)"
    )

    # OpenAI Settings (Paid)
    openai_api_key: Optional[str] = Field(
        default=None,
        description="OpenAI API key ($5 free credits for new accounts)"
    )
    openai_model: str = Field(
        default="gpt-3.5-turbo",
        description="OpenAI model name"
    )

    # Local Model Settings
    model_path: str = Field(
        default="./storage/models/mistral-7b",
        description="Local model path (for when using local models)"
    )
    use_local_model: bool = Field(
        default=False,
        description="Use local model instead of API (resource intensive)"
    )

    # General Settings
    max_tokens: int = Field(default=1024, description="Maximum tokens per request")
    temperature: float = Field(default=0.7, description="Sampling temperature")
    top_p: float = Field(default=0.9, description="Top-p sampling parameter")

    class Config:
        extra = "ignore"


class EmbeddingSettings(BaseSettings):
    """Text embedding model configuration."""

    model_name: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Sentence transformer model name (lightweight, 23MB)"
    )
    batch_size: int = Field(default=8, description="Embedding batch size (reduced for students)")
    max_length: int = Field(default=512, description="Maximum token length")
    normalize_embeddings: bool = Field(
        default=True,
        description="Normalize embeddings to unit vectors"
    )

    class Config:
        extra = "ignore"


class DocumentSettings(BaseSettings):
    """Document processing configuration."""

    storage_path: str = Field(
        default="./storage/documents",
        description="Document storage path"
    )
    max_file_size_mb: int = Field(
        default=50,
        description="Maximum file size in MB (reduced for students)"
    )
    supported_formats: List[str] = Field(
        default=["pdf", "docx", "txt", "html", "md"],
        description="Supported document formats"
    )
    chunk_size: int = Field(default=500, description="Text chunk size (reduced for faster processing)")
    chunk_overlap: int = Field(default=100, description="Chunk overlap size")
    ocr_enabled: bool = Field(default=False, description="Enable OCR for scanned documents")
    max_concurrent_uploads: int = Field(default=2, description="Max concurrent uploads (reduced)")

    class Config:
        extra = "ignore"


class MonitoringSettings(BaseSettings):
    """Monitoring and observability settings."""

    sentry_dsn: Optional[str] = Field(
        default=None,
        description="Sentry DSN for error tracking (use self-hosted or free tier)"
    )
    log_level: str = Field(default="INFO", description="Logging level")
    enable_prometheus: bool = Field(
        default=True,
        description="Enable Prometheus metrics (self-hosted)"
    )
    metrics_port: int = Field(default=8001, description="Metrics server port")
    jaeger_endpoint: Optional[str] = Field(
        default=None,
        description="Jaeger tracing endpoint (optional)"
    )

    class Config:
        extra = "ignore"


class APISettings(BaseSettings):
    """API server configuration."""

    host: str = Field(default="0.0.0.0", description="API server host")
    port: int = Field(default=8000, description="API server port")
    reload: bool = Field(default=True, description="Auto-reload on code changes (dev mode)")
    workers: int = Field(default=1, description="Number of worker processes")
    max_requests: int = Field(default=500, description="Max requests per worker (reduced)")
    timeout: int = Field(default=30, description="Request timeout in seconds")

    # CORS settings
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    cors_credentials: bool = Field(default=True, description="Allow credentials in CORS")
    cors_methods: List[str] = Field(
        default=["*"],
        description="Allowed CORS methods"
    )
    cors_headers: List[str] = Field(
        default=["*"],
        description="Allowed CORS headers"
    )

    class Config:
        extra = "ignore"


class Settings(BaseSettings):
    """Main application settings combining all configuration."""

    # Environment
    env: str = Field(default="development", description="Environment name")
    debug: bool = Field(default=True, description="Debug mode (enabled for students)")
    testing: bool = Field(default=False, description="Testing mode")

    # Application info
    app_name: str = Field(default="ThinkDocs", description="Application name")
    app_version: str = Field(default="0.1.0", description="Application version")
    app_description: str = Field(
        default="AI-Powered Intelligent Document Assistant - 100% Free for Students",
        description="Application description"
    )

    # Student mode
    student_mode: bool = Field(
        default=True,
        description="Enable student-friendly optimizations"
    )

    # Nested settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    vector_db: VectorDBSettings = Field(default_factory=VectorDBSettings)
    celery: CelerySettings = Field(default_factory=CelerySettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    embedding: EmbeddingSettings = Field(default_factory=EmbeddingSettings)
    document: DocumentSettings = Field(default_factory=DocumentSettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    api: APISettings = Field(default_factory=APISettings)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_nested_delimiter = "__"  # CRITICAL: Support nested env vars like DATABASE__DATABASE_URL
        case_sensitive = False
        extra = "ignore"  # Production: Ignore unknown env vars for robustness

    @validator("env")
    def validate_environment(cls, v):
        """Validate environment name."""
        allowed_envs = ["development", "staging", "production", "testing"]
        if v not in allowed_envs:
            raise ValueError(f"Environment must be one of: {allowed_envs}")
        return v

    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.env == "development"

    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.env == "production"

    def is_testing(self) -> bool:
        """Check if running in testing mode."""
        return self.env == "testing" or self.testing


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


# Convenience function for getting settings
settings = get_settings()
