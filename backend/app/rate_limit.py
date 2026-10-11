"""Rate limiting for the one endpoint that writes.

The limit string is read through a callable so tests can tighten it at runtime
without re-importing the application.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

limiter = Limiter(key_func=get_remote_address, enabled=settings.rate_limit_enabled)


def create_limit() -> str:
    return settings.rate_limit_create
