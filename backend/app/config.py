"""Application settings, read from `PETALPOST_*` environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PETALPOST_",
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Storage
    data_dir: Path = BACKEND_DIR / "data"
    database_url: str = ""

    # Where the built frontend lives. Served by FastAPI in production.
    frontend_dist: Path = BACKEND_DIR.parent / "frontend" / "dist"

    # The code that unlocks the builder. Whoever has it can replace the bouquet
    # on the home page, so set a real one in production.
    create_code: str = "520"

    # Limits
    max_body_bytes: int = 64 * 1024
    rate_limit_enabled: bool = True
    rate_limit_create: str = "20/minute"
    rate_limit_unlock: str = "10/minute"

    # CORS origins for local development.
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )

    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{(self.data_dir / 'petalpost.db').as_posix()}"


settings = Settings()
