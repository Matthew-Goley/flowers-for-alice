"""Server-rendered Open Graph tags for /b/{id}.

Crawlers do not run the SPA, so these tags are the only thing a link preview in
iMessage or Discord ever sees. They are built by `_inject_meta`, which is
tested directly here: whether the built frontend happens to be present on disk
is a property of the developer's working tree, not of this behaviour.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.main import META_CLOSE, META_OPEN, _inject_meta, _meta_tags

from .conftest import make_design

PAGE = f"""<!doctype html>
<html><head>
  <meta charset="UTF-8" />
  {META_OPEN}
  <title>Petal Post</title>
  <meta name="description" content="fallback" />
  {META_CLOSE}
</head><body><div id="root"></div></body></html>"""


def create(client: TestClient, **overrides: object) -> str:
    response = client.post("/api/bouquets", json=make_design(**overrides))
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_injection_replaces_the_whole_block() -> None:
    out = _inject_meta(PAGE, "<title>New</title>")

    assert "<title>New</title>" in out
    # The dev fallback, and both markers, are gone.
    assert "fallback" not in out
    assert "<title>Petal Post</title>" not in out
    assert META_OPEN not in out
    assert META_CLOSE not in out
    # Exactly one title survives.
    assert out.count("<title>") == 1
    # The rest of the document is untouched.
    assert '<div id="root">' in out
    assert '<meta charset="UTF-8" />' in out


def test_injection_leaves_a_page_without_markers_alone() -> None:
    page = "<html><head><title>Plain</title></head></html>"
    assert _inject_meta(page, "<title>New</title>") == page


def test_tags_name_the_recipient(client: TestClient) -> None:
    bouquet_id = create(client, recipient_name="Marianne")
    tags = _meta_tags(bouquet_id)

    assert "Flowers for Marianne" in tags
    assert f"/b/{bouquet_id}" in tags
    assert f"/api/og/{bouquet_id}" in tags
    assert 'name="twitter:card" content="summary_large_image"' in tags


def test_tags_use_the_message_as_the_description(client: TestClient) -> None:
    bouquet_id = create(client, message="Hope the week is treating you kindly.")
    assert "Hope the week is treating you kindly." in _meta_tags(bouquet_id)


def test_long_messages_are_trimmed_for_the_description(client: TestClient) -> None:
    # Well under the 300-character field limit, but well over the 160 a link
    # preview will show.
    bouquet_id = create(client, message="word " * 50)
    tags = _meta_tags(bouquet_id)

    description = tags.split('name="description" content="')[1].split('"')[0]
    assert len(description) <= 160


def test_user_text_is_escaped_into_the_markup(client: TestClient) -> None:
    """The one place stored text becomes HTML, so it has to be escaped here."""
    bouquet_id = create(
        client,
        recipient_name='Ada" onload="alert(1)',
        message="<script>alert(2)</script>",
    )
    tags = _meta_tags(bouquet_id)

    assert "<script>" not in tags
    assert 'onload="alert' not in tags
    assert "&lt;script&gt;" in tags
    assert "&quot;" in tags


def test_a_sealed_bouquet_advertises_its_date_not_its_message(client: TestClient) -> None:
    when = datetime.now(UTC) + timedelta(days=5)
    bouquet_id = create(client, reveal_at=when.isoformat(), message="the secret is a puppy")
    tags = _meta_tags(bouquet_id)

    assert "puppy" not in tags
    assert "opens on" in tags.lower()


def test_unknown_id_falls_back_to_site_defaults() -> None:
    tags = _meta_tags("zzzzzzzz")
    assert "Someone sent you flowers" in tags
    assert "og:image" in tags
