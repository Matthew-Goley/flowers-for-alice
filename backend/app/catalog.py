"""The canonical vocabulary of the bouquet schema.

Mirrored on the frontend in `frontend/src/types/bouquet.ts`. If you add a flower,
a wrap or a greenery style, change both files and the OG painter in `og_render.py`.
"""

from __future__ import annotations

from typing import Final, Literal, get_args

FlowerType = Literal[
    "rose",
    "peony",
    "tulip",
    "sunflower",
    "lily",
    "daisy",
    "orchid",
    "dahlia",
    "anemone",
    "carnation",
    "zinnia",
    "ranunculus",
]

GreeneryType = Literal["none", "eucalyptus", "fern", "babys-breath"]

WrapStyle = Literal["kraft", "linen", "lace", "gingham", "vellum"]

BouquetMode = Literal["bouquet", "letters"]

FLOWER_TYPES: Final[tuple[str, ...]] = get_args(FlowerType)
GREENERY_TYPES: Final[tuple[str, ...]] = get_args(GreeneryType)
WRAP_STYLES: Final[tuple[str, ...]] = get_args(WrapStyle)
BOUQUET_MODES: Final[tuple[str, ...]] = get_args(BouquetMode)

# A hand bouquet holds 6 to 10 stems. Letter bouquets are built from many small
# blooms laid out along letter strokes, so they get a much larger ceiling.
MIN_BOUQUET_FLOWERS: Final[int] = 6
MAX_BOUQUET_FLOWERS: Final[int] = 10
MAX_LETTER_FLOWERS: Final[int] = 600

MAX_MESSAGE_CHARS: Final[int] = 300
MAX_NAME_CHARS: Final[int] = 60
MAX_LETTER_CHARS: Final[int] = 20
