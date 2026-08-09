from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables or a local .env file."""

    database_url: str = "sqlite:///./bidsight.db"
    gemini_api_key: str | None = Field(default=None, repr=False)
    gemini_model: str = "gemini-2.5-flash"
    upload_dir: str = "uploads"
    frontend_url: str = "http://localhost:3000"
    max_upload_size_mb: int = 10

    model_config = SettingsConfigDict(
        env_file=(PROJECT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def upload_path(self) -> Path:
        configured_path = Path(self.upload_dir)
        if configured_path.is_absolute():
            return configured_path
        return (BACKEND_DIR / configured_path).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
