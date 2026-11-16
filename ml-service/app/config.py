"""Application configuration loaded from environment variables and .env file."""

from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Fraud Detection ML Service settings.

    Values are loaded from environment variables first, then from a .env file
    located in the project root directory.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        protected_namespaces=("settings_",),
    )

    port: int = 8000
    model_path: str = "app/models/model.joblib"
    log_level: str = "info"


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
