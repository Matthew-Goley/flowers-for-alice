"""Rate limiting for the endpoints that write or check the create code.

The limit strings are read through callables so tests can tighten them at
runtime without re-importing the application.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

limiter = Limiter(key_func=get_remote_address, enabled=settings.rate_limit_enabled)


def create_limit() -> str:
    return settings.rate_limit_create


def unlock_limit() -> str:
    return settings.rate_limit_unlock
