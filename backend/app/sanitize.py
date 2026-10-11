"""User text hygiene.

Everything a stranger can type is squeezed through `clean_text` before it is
stored: control characters and zero-width joiners are dropped, whitespace is
collapsed, and the result is trimmed. HTML escaping happens later, at the point
of rendering into a template (see `main.py`), so the stored value stays readable.

The odd codepoints below are spelled with `chr()` rather than written inline:
they are invisible in an editor, and a literal zero-width space sitting in a
string constant is exactly the kind of thing that survives a refactor by
accident.
"""

from __future__ import annotations

import re
import unicodedata

ZERO_WIDTH_SPACE = chr(0x200B)
ZERO_WIDTH_NON_JOINER = chr(0x200C)
ZERO_WIDTH_JOINER = chr(0x200D)
WORD_JOINER = chr(0x2060)
BYTE_ORDER_MARK = chr(0xFEFF)
LINE_SEPARATOR = chr(0x2028)
PARAGRAPH_SEPARATOR = chr(0x2029)

_ZERO_WIDTH = frozenset(
    {
        ZERO_WIDTH_SPACE,
        ZERO_WIDTH_NON_JOINER,
        ZERO_WIDTH_JOINER,
        WORD_JOINER,
        BYTE_ORDER_MARK,
    }
)
_CONTROL_CATEGORIES = frozenset({"Cc", "Cf", "Cs", "Co", "Cn"})

_NEWLINES = re.compile(f"\r\n?|[{LINE_SEPARATOR}{PARAGRAPH_SEPARATOR}]")
_MANY_NEWLINES = re.compile(r"\n{3,}")
_HORIZONTAL_RUN = re.compile(r"[^\S\n]{2,}")


def clean_text(value: str, *, allow_newlines: bool = False) -> str:
    """Normalise and de-fang a user-supplied string.

    Newlines survive only when `allow_newlines` is set (the greeting message);
    everywhere else they collapse to a single space. Tabs always become spaces
    rather than vanishing, so words cannot be silently glued together.
    """
    text = unicodedata.normalize("NFC", value)
    text = _NEWLINES.sub("\n", text)
    text = text.expandtabs(1)

    kept: list[str] = []
    for ch in text:
        if ch in _ZERO_WIDTH:
            continue
        if ch == "\n":
            kept.append("\n" if allow_newlines else " ")
            continue
        if unicodedata.category(ch) in _CONTROL_CATEGORIES:
            continue
        kept.append(ch)

    text = _HORIZONTAL_RUN.sub(" ", "".join(kept))
    text = _MANY_NEWLINES.sub("\n\n", text)
    return "\n".join(line.strip() for line in text.split("\n")).strip()
