"""Open Graph image rendering and the server-rendered meta tags."""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import settings
from app.og_render import OG_HEIGHT, OG_WIDTH, render_og_png

from .conftest import make_design, make_flowers


def create(client: TestClient, **overrides: object) -> str:
    response = client.post("/api/bouquets", json=make_design(**overrides))
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_og_endpoint_returns_a_png_of_the_right_size(client: TestClient) -> None:
    bouquet_id = create(client)
    response = client.get(f"/api/og/{bouquet_id}")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"

    image = Image.open(io.BytesIO(response.content))
    assert image.size == (OG_WIDTH, OG_HEIGHT)


def test_og_image_is_cached_on_disk(client: TestClient) -> None:
    bouquet_id = create(client)
    cached = settings.og_cache_dir / f"{bouquet_id}-open.png"

    assert not cached.exists()
    client.get(f"/api/og/{bouquet_id}")
    assert cached.exists()

    # A second request serves the same bytes from the cache file.
    stamp = cached.stat().st_mtime_ns
    second = client.get(f"/api/og/{bouquet_id}")
    assert second.status_code == 200
    assert cached.stat().st_mtime_ns == stamp


def test_locked_and_open_previews_are_cached_separately(client: TestClient) -> None:
    when = datetime.now(UTC) + timedelta(days=2)
    bouquet_id = create(client, reveal_at=when.isoformat())

    client.get(f"/api/og/{bouquet_id}")
    assert (settings.og_cache_dir / f"{bouquet_id}-locked.png").exists()
    assert not (settings.og_cache_dir / f"{bouquet_id}-open.png").exists()


def test_locked_preview_does_not_leak_the_message(client: TestClient) -> None:
    """A sealed bouquet renders as wrapped paper, so it must differ from the open one."""
    design = make_design(message="the secret is a puppy")
    sealed = render_og_png(dict(design), hide_contents=True, reveal_at=datetime.now(UTC))
    opened = render_og_png(dict(design), hide_contents=False)
    assert sealed != opened


@pytest.mark.parametrize("wrap", ["kraft", "linen", "lace", "gingham", "vellum"])
def test_every_wrap_style_renders(wrap: str) -> None:
    data = render_og_png(make_design(wrap=wrap))
    assert Image.open(io.BytesIO(data)).size == (OG_WIDTH, OG_HEIGHT)


@pytest.mark.parametrize("greenery", ["none", "eucalyptus", "fern", "babys-breath"])
def test_every_greenery_style_renders(greenery: str) -> None:
    data = render_og_png(make_design(greenery=greenery))
    assert Image.open(io.BytesIO(data)).size == (OG_WIDTH, OG_HEIGHT)


@pytest.mark.parametrize(
    "kind",
    [
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
    ],
)
def test_every_flower_type_renders(kind: str) -> None:
    data = render_og_png(make_design(flowers=make_flowers(6, kind)))
    assert Image.open(io.BytesIO(data)).size == (OG_WIDTH, OG_HEIGHT)


def test_mono_and_letters_modes_render() -> None:
    mono = render_og_png(make_design(mono=True))
    letters = render_og_png(make_design(mode="letters", letter_text="HI", flowers=make_flowers(60)))
    assert Image.open(io.BytesIO(mono)).size == (OG_WIDTH, OG_HEIGHT)
    assert Image.open(io.BytesIO(letters)).size == (OG_WIDTH, OG_HEIGHT)


def test_render_survives_missing_and_junk_fields() -> None:
    """The painter reads stored JSON, so it must not explode on a thin design."""
    data = render_og_png({"flowers": [{"type": "nonsense", "color": "not-a-colour"}]})
    assert Image.open(io.BytesIO(data)).size == (OG_WIDTH, OG_HEIGHT)


def test_long_names_and_messages_do_not_overflow() -> None:
    data = render_og_png(
        make_design(
            recipient_name="Bartholomew Fitzwilliam Montgomery",
            message="word " * 60,
        )
    )
    assert Image.open(io.BytesIO(data)).size == (OG_WIDTH, OG_HEIGHT)
