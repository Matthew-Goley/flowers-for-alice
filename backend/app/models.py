"""Database tables."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel

# Deliberately excludes look-alike characters (0/O, 1/l/I) so an id can be read
# aloud or typed from a screenshot without ambiguity.
ID_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789"
ID_LENGTH = 8


def new_id() -> str:
    return "".join(secrets.choice(ID_ALPHABET) for _ in range(ID_LENGTH))


def utcnow() -> datetime:
    return datetime.now(UTC)


class Bouquet(SQLModel, table=True):
    """A shared bouquet.

    The design itself is kept as a JSON string rather than exploded into columns:
    it is only ever read back whole, and the Pydantic model in `schemas.py` is the
    thing that defines its shape.
    """

    id: str = Field(default_factory=new_id, primary_key=True, max_length=16)
    mode: str = Field(default="bouquet", index=True)
    payload_json: str
    created_at: datetime = Field(default_factory=utcnow, index=True)
    reveal_at: datetime | None = Field(default=None, index=True)
