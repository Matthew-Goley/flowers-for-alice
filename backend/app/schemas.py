"""Request/response schemas for the bouquet API.

This is the authoritative server-side contract. The TypeScript mirror lives at
`frontend/src/types/bouquet.ts`; keep the two in step.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from .catalog import (
    MAX_BOUQUET_FLOWERS,
    MAX_LETTER_CHARS,
    MAX_LETTER_FLOWERS,
    MAX_MESSAGE_CHARS,
    MAX_NAME_CHARS,
    MIN_BOUQUET_FLOWERS,
    BouquetMode,
    FlowerType,
    GreeneryType,
    WrapStyle,
)
from .sanitize import clean_text

HEX_COLOR = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
LETTER_TEXT = re.compile(r"^[A-Za-z ]+$")

# A reveal date further out than this is almost certainly a typo or an attempt
# to park rows in the database forever.
MAX_REVEAL_HORIZON = timedelta(days=366 * 2)

HexColor = Annotated[str, Field(min_length=4, max_length=7)]


def _hex(value: str) -> str:
    value = value.strip()
    if not HEX_COLOR.match(value):
        raise ValueError("must be a hex colour such as #E4A0B7")
    return value.lower()


class FlowerPlacement(BaseModel):
    """One bloom, positioned in the bouquet's 0-100 square coordinate space."""

    model_config = ConfigDict(extra="forbid")

    type: FlowerType
    color: HexColor
    # Dragging is allowed to spill a little past the canvas edge.
    x: float = Field(ge=-25, le=125)
    y: float = Field(ge=-25, le=125)
    rotation: float = Field(ge=-360, le=360)
    scale: float = Field(ge=0.1, le=4)

    @field_validator("color")
    @classmethod
    def _check_color(cls, value: str) -> str:
        return _hex(value)

    @field_validator("x", "y", "rotation", "scale")
    @classmethod
    def _round(cls, value: float) -> float:
        # Positions arrive from a drag gesture; two decimals is plenty and keeps
        # stored payloads small.
        return round(value, 2)


class BouquetDesign(BaseModel):
    """Everything needed to draw a bouquet, minus server-assigned fields."""

    model_config = ConfigDict(extra="forbid")

    mode: BouquetMode = "bouquet"
    flowers: list[FlowerPlacement]
    greenery: GreeneryType = "none"
    wrap: WrapStyle = "kraft"
    ribbon: HexColor = "#e4a0b7"
    mono: bool = False
    recipient_name: str = Field(default="", max_length=MAX_NAME_CHARS)
    sender_name: str = Field(default="", max_length=MAX_NAME_CHARS)
    message: str = Field(default="", max_length=MAX_MESSAGE_CHARS)
    letter_text: str | None = Field(default=None, max_length=MAX_LETTER_CHARS)
    reveal_at: datetime | None = None

    @field_validator("ribbon")
    @classmethod
    def _check_ribbon(cls, value: str) -> str:
        return _hex(value)

    @field_validator("recipient_name", "sender_name", mode="before")
    @classmethod
    def _clean_name(cls, value: object) -> object:
        if isinstance(value, str):
            return clean_text(value)
        return value

    @field_validator("message", mode="before")
    @classmethod
    def _clean_message(cls, value: object) -> object:
        if isinstance(value, str):
            return clean_text(value, allow_newlines=True)
        return value

    @field_validator("letter_text", mode="before")
    @classmethod
    def _clean_letters(cls, value: object) -> object:
        if isinstance(value, str):
            return clean_text(value).upper()
        return value

    @field_validator("letter_text")
    @classmethod
    def _check_letters(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not LETTER_TEXT.match(value):
            raise ValueError("letter text may only contain A-Z and spaces")
        return value

    @field_validator("reveal_at")
    @classmethod
    def _check_reveal(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        moment = value if value.tzinfo else value.replace(tzinfo=UTC)
        moment = moment.astimezone(UTC)
        if moment > datetime.now(UTC) + MAX_REVEAL_HORIZON:
            raise ValueError("reveal date must be within two years")
        return moment

    @model_validator(mode="after")
    def _check_shape(self) -> Self:
        count = len(self.flowers)
        if self.mode == "bouquet":
            if not MIN_BOUQUET_FLOWERS <= count <= MAX_BOUQUET_FLOWERS:
                raise ValueError(
                    f"a bouquet needs between {MIN_BOUQUET_FLOWERS} and "
                    f"{MAX_BOUQUET_FLOWERS} flowers, got {count}"
                )
        else:
            if not 1 <= count <= MAX_LETTER_FLOWERS:
                raise ValueError(
                    f"a letter bouquet needs between 1 and {MAX_LETTER_FLOWERS} flowers, "
                    f"got {count}"
                )
            if not self.letter_text:
                raise ValueError("letter_text is required in letters mode")
        return self


class BouquetCreated(BaseModel):
    """What the share step receives back."""

    id: str
    url_path: str


class BouquetOut(BouquetDesign):
    """A fully unlocked bouquet."""

    id: str
    created_at: datetime
    locked: bool = False


class BouquetLocked(BaseModel):
    """A bouquet whose reveal date has not arrived yet.

    The flowers and the message are deliberately withheld so the recipient
    cannot peek by reading the network response. Only enough detail to render
    the wrapped parcel and a countdown is returned.
    """

    id: str
    created_at: datetime
    locked: bool = True
    mode: BouquetMode
    reveal_at: datetime
    wrap: WrapStyle
    ribbon: str
    recipient_name: str
    sender_name: str


class FlowerMeaning(BaseModel):
    type: FlowerType
    name: str
    meaning: str


class Health(BaseModel):
    status: str
    app: str
    version: str
