"""Application settings.

The product name lives in one place for the whole monorepo: `brand.json` at the
repository root. The frontend inlines it at build time (see `frontend/vite.config.ts`)
and the backend reads it here, so a rename is a one-file edit.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
BRAND_FILE = REPO_ROOT / "brand.json"

_BRAND_FALLBACK = {
    "name": "Petal Post",
    "tagline": "Send someone flowers that never wilt.",
    "domain": "petalpost.app",
    "supportEmail": "hello@petalpost.app",
}


@lru_cache(maxsize=1)
def brand() -> dict[str, str]:
    """Read `brand.json`, falling back to defaults if it is missing."""
    try:
        data = json.loads(BRAND_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return dict(_BRAND_FALLBACK)
    merged = dict(_BRAND_FALLBACK)
    merged.update({k: str(v) for k, v in data.items() if isinstance(v, str)})
    return merged


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

    # Public base URL, used for absolute og:image / og:url tags.
    public_base_url: str = "http://localhost:5173"

    # Where the built frontend lives. Served by FastAPI in production.
    frontend_dist: Path = BACKEND_DIR.parent / "frontend" / "dist"

    # Limits
    max_body_bytes: int = 64 * 1024
    rate_limit_enabled: bool = True
    rate_limit_create: str = "20/minute"

    # CORS origins for local development.
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )

    @property
    def app_name(self) -> str:
        return brand()["name"]

    @property
    def tagline(self) -> str:
        return brand()["tagline"]

    @property
    def og_cache_dir(self) -> Path:
        return self.data_dir / "og"

    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{(self.data_dir / 'petalpost.db').as_posix()}"


settings = Settings()
