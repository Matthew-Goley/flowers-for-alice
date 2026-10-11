"""Server-side bouquet painter for Open Graph preview images.

Why Pillow and not a real SVG rasteriser: cairosvg needs native cairo/GTK
libraries, which are a genuine pain to install on Windows and add a lot of
weight to a deploy image. The preview does not need to be pixel-identical to
the browser, it needs to be recognisably *this* bouquet at thumbnail size in
iMessage. So the flowers are re-drawn here from the same stored geometry using
a small set of petal primitives that echo the SVG components in
`frontend/src/components/flowers/`.

Everything is drawn at 2x and downsampled, which is a cheap way to get
antialiasing out of Pillow's hard-edged polygon fill.
"""

from __future__ import annotations

import io
import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OG_WIDTH = 1200
OG_HEIGHT = 630
SUPERSAMPLE = 2

INK = "#3f3038"
INK_SOFT = "#8a7580"
CREAM_TOP = (255, 250, 245)
CREAM_BOTTOM = (250, 231, 223)

# The bouquet occupies a square on the left; copy sits in the column on the right.
ART_BOX = (44.0, 15.0, 644.0, 615.0)
TEXT_LEFT = 684
TEXT_RIGHT = 1156

_FONT_CANDIDATES: dict[str, tuple[str, ...]] = {
    "serif": (
        "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/constan.ttf",
        "C:/Windows/Fonts/times.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/Library/Fonts/Georgia.ttf",
        "DejaVuSerif.ttf",
    ),
    "serif-italic": (
        "C:/Windows/Fonts/georgiai.ttf",
        "C:/Windows/Fonts/timesi.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
        "DejaVuSerif-Italic.ttf",
    ),
    "sans": (
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/Library/Fonts/Arial.ttf",
        "DejaVuSans.ttf",
    ),
    "sans-bold": (
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "DejaVuSans-Bold.ttf",
    ),
}

AnyFont = ImageFont.FreeTypeFont | ImageFont.ImageFont


@lru_cache(maxsize=64)
def _font(kind: str, size: int) -> AnyFont:
    for candidate in _FONT_CANDIDATES.get(kind, ()):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow older than 10.1
        return ImageFont.load_default()


# --------------------------------------------------------------------------- #
# colour helpers
# --------------------------------------------------------------------------- #

RGB = tuple[int, int, int]


def _rgb(value: str | RGB) -> RGB:
    if not isinstance(value, str):
        return value
    text = value.lstrip("#")
    if len(text) == 3:
        text = "".join(ch * 2 for ch in text)
    try:
        return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))
    except (ValueError, IndexError):
        return (228, 160, 183)


def _shade(value: str | RGB, amount: float) -> RGB:
    """Mix a colour toward white (amount > 0) or black (amount < 0)."""
    r, g, b = _rgb(value)
    if amount >= 0:
        return (
            round(r + (255 - r) * amount),
            round(g + (255 - g) * amount),
            round(b + (255 - b) * amount),
        )
    k = 1.0 + amount
    return (round(r * k), round(g * k), round(b * k))


# --------------------------------------------------------------------------- #
# shape primitives
# --------------------------------------------------------------------------- #

Point = tuple[float, float]


def _leaf(
    cx: float,
    cy: float,
    angle_deg: float,
    length: float,
    width: float,
    *,
    start: float = 0.0,
    pointiness: float = 1.0,
    steps: int = 16,
) -> list[Point]:
    """A petal outline: a lens shape running outward from (cx, cy).

    `pointiness` below 1 rounds the tip (peony, daisy); above 1 draws it out to
    a point (lily, sunflower).
    """
    rad = math.radians(angle_deg)
    ca, sa = math.cos(rad), math.sin(rad)
    upper: list[Point] = []
    lower: list[Point] = []
    for i in range(steps + 1):
        t = i / steps
        along = start + t * length
        half = width * (math.sin(math.pi * t) ** pointiness)
        upper.append((cx + along * ca - half * sa, cy + along * sa + half * ca))
        lower.append((cx + along * ca + half * sa, cy + along * sa - half * ca))
    return upper + list(reversed(lower))


def _circle(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    r: float,
    *,
    fill: RGB | None = None,
    outline: RGB | None = None,
    width: int = 1,
) -> None:
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline, width=width)


# --------------------------------------------------------------------------- #
# flower vocabulary
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Ring:
    """One concentric row of petals, sized as a fraction of the flower radius.

    Petals are spread evenly around the circle unless `angles` names the exact
    bearings, which is what gives the tulip and the orchid their lopsided,
    front-facing look instead of a symmetric rosette.
    """

    count: int
    length: float
    width: float
    start: float = 0.0
    phase: float = 0.0
    lighten: float = 0.0
    angles: tuple[float, ...] | None = None

    def bearings(self) -> tuple[float, ...]:
        if self.angles is not None:
            return self.angles
        return tuple(self.phase + (360.0 / self.count) * i for i in range(self.count))


@dataclass(frozen=True)
class FlowerSpec:
    rings: tuple[Ring, ...]
    pointiness: float = 1.0
    core: float = 0.17
    core_color: str = "#f6dca2"
    core_dots: int = 0


FLOWER_SPECS: dict[str, FlowerSpec] = {
    "rose": FlowerSpec(
        rings=(
            Ring(6, 1.00, 0.44, 0.06, 0, -0.08),
            Ring(5, 0.72, 0.40, 0.04, 36, 0.06),
            Ring(4, 0.46, 0.34, 0.02, 70, 0.16),
        ),
        pointiness=0.8,
        core=0.10,
        core_color="#ffffff",
    ),
    "peony": FlowerSpec(
        rings=(
            Ring(9, 1.00, 0.42, 0.08, 0, -0.06),
            Ring(8, 0.76, 0.40, 0.05, 22, 0.08),
            Ring(6, 0.50, 0.36, 0.02, 48, 0.20),
        ),
        pointiness=0.62,
        core=0.12,
        core_color="#fbe6b4",
    ),
    # A closed cup: three petals leaning together rather than a full rosette.
    "tulip": FlowerSpec(
        rings=(
            Ring(2, 0.98, 0.34, 0.08, 0, -0.04, angles=(-126.0, -54.0)),
            Ring(1, 1.02, 0.40, 0.04, 0, 0.10, angles=(-90.0,)),
        ),
        pointiness=1.5,
        core=0.0,
    ),
    "sunflower": FlowerSpec(
        rings=(
            Ring(18, 1.00, 0.20, 0.30, 0, 0.0),
            Ring(16, 0.82, 0.18, 0.26, 11, 0.14),
        ),
        pointiness=1.5,
        core=0.34,
        core_color="#5b4330",
        core_dots=22,
    ),
    "lily": FlowerSpec(
        rings=(Ring(6, 1.00, 0.26, 0.08, 0, 0.0),),
        pointiness=1.7,
        core=0.10,
        core_color="#f2c75e",
        core_dots=6,
    ),
    "daisy": FlowerSpec(
        rings=(
            Ring(13, 1.00, 0.17, 0.26, 0, 0.0),
            Ring(13, 0.90, 0.15, 0.24, 14, -0.07),
        ),
        pointiness=0.85,
        core=0.27,
        core_color="#f4c445",
    ),
    # Two broad upper petals, two side wings, and a drooping lip.
    "orchid": FlowerSpec(
        rings=(
            Ring(4, 0.98, 0.40, 0.10, 0, 0.0, angles=(-145.0, -35.0, 170.0, 10.0)),
            Ring(1, 0.86, 0.30, 0.08, 0, -0.14, angles=(90.0,)),
        ),
        pointiness=0.7,
        core=0.15,
        core_color="#f8e7c9",
    ),
    "dahlia": FlowerSpec(
        rings=(
            Ring(10, 1.00, 0.26, 0.12, 0, -0.07),
            Ring(9, 0.78, 0.24, 0.08, 18, 0.05),
            Ring(7, 0.52, 0.20, 0.04, 40, 0.17),
        ),
        pointiness=1.25,
        core=0.11,
        core_color="#fde9bb",
    ),
    "anemone": FlowerSpec(
        rings=(
            Ring(7, 1.00, 0.36, 0.14, 0, 0.0),
            Ring(6, 0.74, 0.30, 0.10, 25, 0.10),
        ),
        pointiness=0.7,
        core=0.30,
        core_color="#2f2a3a",
        core_dots=14,
    ),
    "carnation": FlowerSpec(
        rings=(
            Ring(11, 1.00, 0.30, 0.16, 0, -0.05),
            Ring(10, 0.80, 0.28, 0.12, 16, 0.07),
            Ring(8, 0.58, 0.24, 0.06, 34, 0.18),
        ),
        pointiness=0.55,
        core=0.08,
        core_color="#ffffff",
    ),
    "zinnia": FlowerSpec(
        rings=(
            Ring(12, 1.00, 0.22, 0.20, 0, 0.0),
            Ring(11, 0.76, 0.20, 0.14, 15, 0.12),
        ),
        pointiness=0.95,
        core=0.20,
        core_color="#f6d666",
        core_dots=9,
    ),
    "ranunculus": FlowerSpec(
        rings=(
            Ring(8, 1.00, 0.30, 0.10, 0, -0.08),
            Ring(8, 0.80, 0.28, 0.07, 22, 0.02),
            Ring(7, 0.60, 0.24, 0.04, 44, 0.12),
            Ring(5, 0.38, 0.20, 0.02, 66, 0.24),
        ),
        pointiness=0.6,
        core=0.08,
        core_color="#f3ead2",
    ),
}

DEFAULT_SPEC = FLOWER_SPECS["daisy"]

GREEN_DARK = "#4f6b4a"
GREEN_MID = "#6d8c63"
GREEN_SOFT = "#93ab82"


def _draw_flower(
    draw: ImageDraw.ImageDraw,
    kind: str,
    cx: float,
    cy: float,
    radius: float,
    color: str,
    rotation: float,
    mono: bool,
) -> None:
    spec = FLOWER_SPECS.get(kind, DEFAULT_SPEC)
    outline = _rgb(INK) if mono else _shade(color, -0.45)
    line_w = max(1, round(radius * 0.055))

    for ring in spec.rings:
        fill = None if mono else _shade(color, ring.lighten)
        for bearing in ring.bearings():
            draw.polygon(
                _leaf(
                    cx,
                    cy,
                    rotation + bearing,
                    ring.length * radius,
                    ring.width * radius,
                    start=ring.start * radius,
                    pointiness=spec.pointiness,
                ),
                fill=fill,
                outline=outline,
                width=line_w,
            )

    if spec.core <= 0:
        return

    core_r = spec.core * radius
    _circle(
        draw,
        cx,
        cy,
        core_r,
        fill=None if mono else _rgb(spec.core_color),
        outline=outline,
        width=line_w,
    )
    if spec.core_dots and not mono:
        dot_r = max(1.0, core_r * 0.16)
        for i in range(spec.core_dots):
            a = math.radians(rotation + (360.0 / spec.core_dots) * i)
            rr = core_r * (0.4 if i % 2 else 0.68)
            _circle(
                draw,
                cx + rr * math.cos(a),
                cy + rr * math.sin(a),
                dot_r,
                fill=_shade(spec.core_color, -0.35),
            )


# --------------------------------------------------------------------------- #
# greenery, wrap, ribbon
# --------------------------------------------------------------------------- #


def _draw_sprig(
    draw: ImageDraw.ImageDraw,
    kind: str,
    cx: float,
    cy: float,
    angle: float,
    length: float,
    mono: bool,
) -> None:
    rad = math.radians(angle)
    tip = (cx + length * math.cos(rad), cy + length * math.sin(rad))
    stroke = _rgb(INK) if mono else _rgb(GREEN_MID)
    draw.line([(cx, cy), tip], fill=stroke, width=max(1, round(length * 0.022)))

    if kind == "babys-breath":
        for i in range(9):
            t = 0.25 + 0.75 * (i / 8)
            jitter = math.sin(i * 2.4) * length * 0.07
            px = cx + (length * t) * math.cos(rad) - jitter * math.sin(rad)
            py = cy + (length * t) * math.sin(rad) + jitter * math.cos(rad)
            for k in range(4):
                a = math.radians(k * 90 + i * 20)
                r = length * 0.028
                _circle(
                    draw,
                    px + r * 1.5 * math.cos(a),
                    py + r * 1.5 * math.sin(a),
                    r,
                    fill=None if mono else (252, 250, 248),
                    outline=_rgb(INK) if mono else _rgb(GREEN_SOFT),
                    width=1,
                )
        return

    leaves = 7 if kind == "eucalyptus" else 11
    for i in range(leaves):
        t = 0.2 + 0.8 * (i / (leaves - 1))
        px = cx + (length * t) * math.cos(rad)
        py = cy + (length * t) * math.sin(rad)
        if kind == "eucalyptus":
            r = length * 0.085 * (1.05 - 0.4 * t)
            for side in (-1, 1):
                _circle(
                    draw,
                    px - side * r * 1.15 * math.sin(rad),
                    py + side * r * 1.15 * math.cos(rad),
                    r,
                    fill=None if mono else _shade(GREEN_SOFT, 0.1 * (1 - t)),
                    outline=_rgb(INK) if mono else _rgb(GREEN_DARK),
                    width=1,
                )
        else:  # fern
            blade = length * 0.19 * (1.1 - 0.65 * t)
            for side in (-1, 1):
                draw.polygon(
                    _leaf(px, py, angle + side * 58, blade, blade * 0.3, pointiness=1.6),
                    fill=None if mono else _rgb(GREEN_MID),
                    outline=_rgb(INK) if mono else _rgb(GREEN_DARK),
                    width=1,
                )


WRAP_PALETTE: dict[str, tuple[str, str]] = {
    "kraft": ("#d8b58c", "#c09a6f"),
    "linen": ("#ece2d4", "#d9cbb8"),
    "lace": ("#fbf5f2", "#eadfe2"),
    "gingham": ("#f3dfe0", "#dcb5bb"),
    "vellum": ("#f7eee6", "#e6d7cb"),
}


# Sleeve geometry, in the bouquet's 0-100 space.
WRAP_TOP_Y = 56.0
WRAP_TOP_HALF = 29.0
WRAP_BOTTOM_Y = 93.0
WRAP_BOTTOM_HALF = 7.5
WRAP_RIM_SAG = 6.0


def _draw_wrap(
    draw: ImageDraw.ImageDraw,
    box: tuple[float, float, float, float],
    wrap: str,
    mono: bool,
) -> Point:
    """Draw the paper sleeve. Returns the point where the ribbon knot sits.

    The silhouette is a tapered sleeve rather than a triangle: the rim sags in
    the middle so the paper reads as an opening the stems come out of, and the
    foot is blunt instead of a spike.
    """
    x0, y0, x1, y1 = box
    w = x1 - x0
    h = y1 - y0

    def pt(px: float, py: float) -> Point:
        return (x0 + w * px / 100.0, y0 + h * py / 100.0)

    def rim(t: float) -> Point:
        """Point along the front rim, t running left (0) to right (1)."""
        return pt(
            50 - WRAP_TOP_HALF + 2 * WRAP_TOP_HALF * t,
            WRAP_TOP_Y + WRAP_RIM_SAG * math.sin(math.pi * t),
        )

    base, deep = WRAP_PALETTE.get(wrap, WRAP_PALETTE["kraft"])
    fill = None if mono else _rgb(base)
    edge = _rgb(INK) if mono else _shade(deep, -0.3)

    rim_pts = [rim(i / 18) for i in range(19)]
    sleeve = [
        *rim_pts,
        pt(50 + WRAP_BOTTOM_HALF, WRAP_BOTTOM_Y - 2),
        pt(50 + WRAP_BOTTOM_HALF * 0.6, WRAP_BOTTOM_Y),
        pt(50 - WRAP_BOTTOM_HALF * 0.6, WRAP_BOTTOM_Y),
        pt(50 - WRAP_BOTTOM_HALF, WRAP_BOTTOM_Y - 2),
    ]
    draw.polygon(sleeve, fill=fill, outline=edge, width=3)

    # The right-hand half is the far side of the cone, so it sits in shadow.
    draw.polygon(
        [
            rim(0.5),
            *[rim(0.5 + 0.5 * (i / 9)) for i in range(1, 10)],
            pt(50 + WRAP_BOTTOM_HALF, WRAP_BOTTOM_Y - 2),
            pt(50 + WRAP_BOTTOM_HALF * 0.6, WRAP_BOTTOM_Y),
            pt(50, WRAP_BOTTOM_Y),
        ],
        fill=None if mono else _rgb(deep),
    )
    draw.polygon(sleeve, fill=None, outline=edge, width=3)
    draw.line([rim(0.5), pt(50, WRAP_BOTTOM_Y)], fill=edge, width=2)

    if mono:
        return pt(50, WRAP_BOTTOM_Y - 21)

    if wrap == "gingham":
        light = _shade(base, 0.4)
        for i in range(1, 6):
            t = i / 6
            yy = WRAP_TOP_Y + 6 + (WRAP_BOTTOM_Y - WRAP_TOP_Y - 8) * t
            half = WRAP_TOP_HALF + (WRAP_BOTTOM_HALF - WRAP_TOP_HALF) * t
            draw.line([pt(50 - half * 0.88, yy), pt(50 + half * 0.88, yy)], fill=light, width=2)
        for i in range(1, 6):
            t = i / 6
            top_x = 50 - WRAP_TOP_HALF * 0.8 + 2 * WRAP_TOP_HALF * 0.8 * t
            bot_x = 50 - WRAP_BOTTOM_HALF * 0.8 + 2 * WRAP_BOTTOM_HALF * 0.8 * t
            draw.line(
                [pt(top_x, WRAP_TOP_Y + 8), pt(bot_x, WRAP_BOTTOM_Y - 2)],
                fill=light,
                width=2,
            )
    elif wrap == "lace":
        for i in range(19):
            px, py = rim(i / 18)
            _circle(draw, px, py, w * 0.012, outline=_shade(deep, -0.12), width=2)
    elif wrap == "vellum":
        for i in range(1, 5):
            t = i / 5
            top_x = 50 - WRAP_TOP_HALF * 0.75 + 2 * WRAP_TOP_HALF * 0.75 * t
            bot_x = 50 - WRAP_BOTTOM_HALF * 0.75 + 2 * WRAP_BOTTOM_HALF * 0.75 * t
            draw.line(
                [pt(top_x, WRAP_TOP_Y + 9), pt(bot_x, WRAP_BOTTOM_Y - 2)],
                fill=_shade(base, 0.3),
                width=2,
            )
    elif wrap == "linen":
        for i in range(1, 7):
            t = i / 7
            yy = WRAP_TOP_Y + 6 + (WRAP_BOTTOM_Y - WRAP_TOP_Y - 8) * t
            half = (WRAP_TOP_HALF + (WRAP_BOTTOM_HALF - WRAP_TOP_HALF) * t) * 0.8
            draw.line([pt(50 - half, yy), pt(50 + half, yy)], fill=_shade(base, -0.08), width=1)

    return pt(50, WRAP_BOTTOM_Y - 21)


def _draw_ribbon(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    color: str,
    mono: bool,
) -> None:
    fill = None if mono else _rgb(color)
    edge = _rgb(INK) if mono else _shade(color, -0.4)
    for side in (-1, 1):
        draw.polygon(
            _leaf(cx, cy, 90 + side * 52, size, size * 0.42, pointiness=0.8),
            fill=fill,
            outline=edge,
            width=2,
        )
        draw.polygon(
            _leaf(cx, cy, 180 + side * 25, size * 0.95, size * 0.24, pointiness=1.4),
            fill=None if mono else _shade(color, -0.12),
            outline=edge,
            width=2,
        )
    _circle(draw, cx, cy, size * 0.2, fill=fill, outline=edge, width=2)


# --------------------------------------------------------------------------- #
# the bouquet
# --------------------------------------------------------------------------- #


def _draw_bouquet(
    draw: ImageDraw.ImageDraw,
    box: tuple[float, float, float, float],
    design: dict,
    *,
    hide_contents: bool,
) -> None:
    x0, y0, x1, y1 = box
    w = x1 - x0
    h = y1 - y0
    mono = bool(design.get("mono"))
    letters = design.get("mode") == "letters"

    def pt(px: float, py: float) -> Point:
        return (x0 + w * px / 100.0, y0 + h * py / 100.0)

    wrap = str(design.get("wrap", "kraft"))
    ribbon = str(design.get("ribbon", "#e4a0b7"))

    if hide_contents:
        knot = _draw_wrap(draw, box, wrap, mono)
        _draw_ribbon(draw, knot[0], knot[1], w * 0.115, ribbon, mono)
        return

    greenery = str(design.get("greenery", "none"))
    if greenery != "none" and not letters:
        bx, by = pt(50, 70)
        for i, angle in enumerate((-162, -140, -118, -62, -40, -18)):
            _draw_sprig(
                draw,
                greenery,
                bx,
                by,
                angle + (3 if i % 2 else -3),
                w * (0.30 if i % 2 else 0.35),
                mono,
            )

    raw: Sequence[dict] = design.get("flowers") or []
    # Painter's algorithm: blooms lower in the arrangement sit in front.
    ordered = sorted(raw, key=lambda f: float(f.get("y", 50) or 0))
    base_radius = w * (0.035 if letters else 0.1)

    if not letters:
        hold = pt(50, 86)
        stem_color = _rgb(INK) if mono else _rgb(GREEN_MID)
        stem_w = max(2, round(w * 0.006))
        for flower in ordered:
            fx, fy = pt(float(flower.get("x", 50) or 0), float(flower.get("y", 50) or 0))
            draw.line([(fx, fy), hold], fill=stem_color, width=stem_w)

    for flower in ordered:
        fx, fy = pt(float(flower.get("x", 50) or 0), float(flower.get("y", 50) or 0))
        _draw_flower(
            draw,
            str(flower.get("type", "daisy")),
            fx,
            fy,
            base_radius * (float(flower.get("scale", 1.0) or 1.0)),
            str(flower.get("color", "#e4a0b7")),
            float(flower.get("rotation", 0.0) or 0.0),
            mono,
        )

    if not letters:
        knot = _draw_wrap(draw, box, wrap, mono)
        _draw_ribbon(draw, knot[0], knot[1], w * 0.115, ribbon, mono)


# --------------------------------------------------------------------------- #
# text
# --------------------------------------------------------------------------- #


def _wrap_text(text: str, font: AnyFont, max_width: float, max_lines: int) -> list[str]:
    """Greedy word wrap, with an ellipsis if the text did not fit."""
    words = text.split()
    if not words:
        return []

    lines: list[str] = []
    current = words[0]
    overflow = False
    for word in words[1:]:
        trial = f"{current} {word}"
        if font.getlength(trial) <= max_width:
            current = trial
            continue
        lines.append(current)
        current = word
        if len(lines) == max_lines:
            overflow = True
            break
    if not overflow and len(lines) < max_lines:
        lines.append(current)
    elif not overflow:
        overflow = True

    if overflow and lines:
        tail = lines[-1]
        while tail and font.getlength(f"{tail} ...") > max_width:
            tail = tail.rsplit(" ", 1)[0] if " " in tail else tail[:-1]
        lines[-1] = f"{tail} ..." if tail else "..."
    return lines[:max_lines]


def _fit_title(text: str, width: float) -> tuple[AnyFont, list[str], int]:
    for size in (74, 64, 54, 46, 38):
        font = _font("serif", size)
        lines = _wrap_text(text, font, width, 2)
        if lines and all(font.getlength(line) <= width for line in lines):
            return font, lines, size
    font = _font("serif", 38)
    return font, _wrap_text(text, font, width, 2), 38


def _draw_text_panel(
    draw: ImageDraw.ImageDraw,
    design: dict,
    *,
    app_name: str,
    tagline: str,
    locked_until: datetime | None,
) -> None:
    width = float(TEXT_RIGHT - TEXT_LEFT)
    y = 104.0

    recipient = str(design.get("recipient_name") or "").strip()
    sender = str(design.get("sender_name") or "").strip()
    message = str(design.get("message") or "").strip()
    letter_text = str(design.get("letter_text") or "").strip()

    if locked_until is not None:
        eyebrow = "A bouquet waiting for"
    elif recipient:
        eyebrow = "A bouquet for"
    else:
        eyebrow = "A bouquet from"
    draw.text((TEXT_LEFT, y), eyebrow.upper(), font=_font("sans-bold", 25), fill=_rgb(INK_SOFT))
    y += 44

    title = recipient or letter_text or sender or app_name
    title_font, title_lines, title_size = _fit_title(title, width)
    for line in title_lines:
        draw.text((TEXT_LEFT, y), line, font=title_font, fill=_rgb(INK))
        y += title_size * 1.16
    y += 18

    if locked_until is not None:
        stamp = locked_until.strftime("%d %B %Y").lstrip("0")
        draw.text((TEXT_LEFT, y), f"Opens on {stamp}", font=_font("sans", 30), fill=_rgb(INK))
        y += 50
    elif message:
        body = _font("serif-italic", 31)
        lines = _wrap_text(message, body, width - 30, 3)
        draw.line(
            [(TEXT_LEFT, y + 4), (TEXT_LEFT, y + 6 + 40 * len(lines))],
            fill=_shade(INK_SOFT, 0.5),
            width=3,
        )
        for line in lines:
            draw.text((TEXT_LEFT + 26, y), line, font=body, fill=_rgb(INK))
            y += 40
        y += 16
    else:
        draw.text((TEXT_LEFT, y), tagline, font=_font("sans", 28), fill=_rgb(INK_SOFT))
        y += 48

    if sender and recipient:
        draw.text((TEXT_LEFT, y), f"from {sender}", font=_font("sans", 27), fill=_rgb(INK_SOFT))

    draw.text(
        (TEXT_LEFT, OG_HEIGHT - 92),
        app_name,
        font=_font("sans-bold", 26),
        fill=_rgb(INK),
    )
    _circle(draw, TEXT_LEFT - 21, OG_HEIGHT - 78, 7, fill=_rgb("#e4a0b7"))


# --------------------------------------------------------------------------- #
# entry points
# --------------------------------------------------------------------------- #


def _background(size: tuple[int, int]) -> Image.Image:
    """Vertical cream gradient with a soft blush halo behind the bouquet."""
    w, h = size
    img = Image.new("RGB", size, CREAM_TOP)
    draw = ImageDraw.Draw(img)
    for row in range(h):
        t = row / max(1, h - 1)
        draw.line(
            [(0, row), (w, row)],
            fill=(
                round(CREAM_TOP[0] + (CREAM_BOTTOM[0] - CREAM_TOP[0]) * t),
                round(CREAM_TOP[1] + (CREAM_BOTTOM[1] - CREAM_TOP[1]) * t),
                round(CREAM_TOP[2] + (CREAM_BOTTOM[2] - CREAM_TOP[2]) * t),
            ),
        )

    scale = w / OG_WIDTH
    halo = Image.new("RGB", size, CREAM_TOP)
    hdraw = ImageDraw.Draw(halo)
    hx = (ART_BOX[0] + ART_BOX[2]) / 2 * scale
    hy = (ART_BOX[1] + ART_BOX[3]) / 2 * scale
    hr = 250 * scale
    hdraw.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(253, 238, 236))
    halo = halo.filter(ImageFilter.GaussianBlur(40 * scale))
    return Image.blend(img, halo, 0.55)


def render_og_png(
    design: dict,
    *,
    app_name: str = "Petal Post",
    tagline: str = "",
    hide_contents: bool = False,
    reveal_at: datetime | None = None,
) -> bytes:
    """Render a 1200x630 preview of a bouquet and return PNG bytes."""
    s = SUPERSAMPLE
    img = _background((OG_WIDTH * s, OG_HEIGHT * s))
    draw = ImageDraw.Draw(img)

    _draw_bouquet(
        draw,
        (ART_BOX[0] * s, ART_BOX[1] * s, ART_BOX[2] * s, ART_BOX[3] * s),
        design,
        hide_contents=hide_contents,
    )

    # Text is drawn after downsampling so glyphs stay crisp.
    img = img.resize((OG_WIDTH, OG_HEIGHT), Image.LANCZOS)
    _draw_text_panel(
        ImageDraw.Draw(img),
        design,
        app_name=app_name,
        tagline=tagline,
        locked_until=reveal_at if hide_contents else None,
    )

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def render_to_path(
    design: dict,
    path: Path,
    *,
    app_name: str = "Petal Post",
    tagline: str = "",
    hide_contents: bool = False,
    reveal_at: datetime | None = None,
) -> Path:
    """Render and atomically write a cached PNG."""
    data = render_og_png(
        design,
        app_name=app_name,
        tagline=tagline,
        hide_contents=hide_contents,
        reveal_at=reveal_at,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{id(data):x}.tmp")
    tmp.write_bytes(data)
    tmp.replace(path)
    return path


def now_utc() -> datetime:
    return datetime.now(UTC)
