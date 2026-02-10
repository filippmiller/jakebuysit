"""
Application configuration using pydantic-settings.
Loads from environment variables with .env file support.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    anthropic_api_key: str
    openai_api_key: Optional[str] = None
    ebay_app_id: Optional[str] = None
    ebay_cert_id: Optional[str] = None
    ebay_dev_id: Optional[str] = None
    amazon_access_key: Optional[str] = None
    amazon_secret_key: Optional[str] = None
    amazon_partner_tag: Optional[str] = None
    serpapi_key: Optional[str] = None

    # Database
    database_url: str
    redis_url: str

    # AWS
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    aws_s3_bucket: Optional[str] = None

    # Application
    app_env: str = "development"
    log_level: str = "INFO"
    api_version: str = "v1"
    enable_cors: bool = True

    # Pricing Config
    min_offer_amount: float = 5.0
    max_electronics_offer: float = 2000.0
    daily_spending_limit: float = 10000.0

    # Cache TTL (seconds)
    cache_ttl_popular: int = 14400  # 4 hours
    cache_ttl_mid_freq: int = 86400  # 24 hours
    cache_ttl_rare: int = 0  # No cache

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields in .env


# Global settings instance
settings = Settings()
