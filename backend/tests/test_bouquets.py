"""API behaviour: the create code, create, fetch, home, validation, locking, rate limiting."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.models import ID_ALPHABET, ID_LENGTH
from app.rate_limit import limiter

from .conftest import make_design, make_flowers


def create(client: TestClient, **overrides: object) -> dict:
    response = client.post("/api/bouquets", json=make_design(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


# --------------------------------------------------------------------------- #
# health
# --------------------------------------------------------------------------- #


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body


# --------------------------------------------------------------------------- #
# the create code
# --------------------------------------------------------------------------- #


def test_unlock_accepts_the_right_code(client: TestClient) -> None:
    assert client.post("/api/unlock", json={"code": "520"}).status_code == 204


@pytest.mark.parametrize("code", ["", "521", "5200", " 520", "abc"])
def test_unlock_rejects_a_wrong_code(client: TestClient, code: str) -> None:
    response = client.post("/api/unlock", json={"code": code})
    assert response.status_code == 403
    assert "detail" in response.json()


def test_the_code_comes_from_settings(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "create_code", "tulip")
    assert client.post("/api/unlock", json={"code": "520"}).status_code == 403
    assert client.post("/api/unlock", json={"code": "tulip"}).status_code == 204


def test_create_without_the_code_is_refused(client: TestClient) -> None:
    del client.headers["X-Create-Code"]
    response = client.post("/api/bouquets", json=make_design())
    assert response.status_code == 403
    assert client.get("/api/home").json() is None


def test_create_with_a_wrong_code_is_refused(client: TestClient) -> None:
    response = client.post("/api/bouquets", json=make_design(), headers={"X-Create-Code": "999"})
    assert response.status_code == 403


def test_unlock_is_rate_limited(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "rate_limit_unlock", "3/minute")
    limiter.enabled = True
    limiter.reset()

    codes = [client.post("/api/unlock", json={"code": "000"}).status_code for _ in range(5)]
    assert codes[:3] == [403, 403, 403]
    assert codes[3:] == [429, 429]


# --------------------------------------------------------------------------- #
# the home page bouquet
# --------------------------------------------------------------------------- #


def test_home_is_empty_before_the_first_bouquet(client: TestClient) -> None:
    response = client.get("/api/home")
    assert response.status_code == 200
    assert response.json() is None


def test_home_shows_the_newest_bouquet(client: TestClient) -> None:
    create(client, recipient_name="First")
    newest = create(client, recipient_name="Second")

    body = client.get("/api/home").json()
    assert body["id"] == newest["id"]
    assert body["recipient_name"] == "Second"
    assert len(body["flowers"]) == 7


def test_a_sealed_home_bouquet_withholds_its_contents(client: TestClient) -> None:
    create(client, reveal_at=(datetime.now(UTC) + timedelta(days=2)).isoformat())
    body = client.get("/api/home").json()
    assert body["locked"] is True
    assert "flowers" not in body
    assert "message" not in body


# --------------------------------------------------------------------------- #
# create
# --------------------------------------------------------------------------- #


def test_create_returns_short_url_safe_id(client: TestClient) -> None:
    body = create(client)
    assert len(body["id"]) == ID_LENGTH
    assert set(body["id"]) <= set(ID_ALPHABET)


def test_ids_are_unique(client: TestClient) -> None:
    ids = {create(client)["id"] for _ in range(12)}
    assert len(ids) == 12


def test_create_then_fetch_round_trips_the_design(client: TestClient) -> None:
    created = create(client, greenery="fern", wrap="lace", mono=True)
    fetched = client.get(f"/api/bouquets/{created['id']}")
    assert fetched.status_code == 200

    body = fetched.json()
    assert body["id"] == created["id"]
    assert body["locked"] is False
    assert body["greenery"] == "fern"
    assert body["wrap"] == "lace"
    assert body["mono"] is True
    assert len(body["flowers"]) == 7
    assert body["flowers"][0]["type"] == "rose"
    assert body["recipient_name"] == "Marianne"
    assert "created_at" in body


def test_text_is_sanitised_on_the_way_in(client: TestClient) -> None:
    created = create(
        client,
        recipient_name="  Zoë​   Smith ",
        message="line one\r\n\r\n\r\n\r\nline two\twith a tab",
    )
    body = client.get(f"/api/bouquets/{created['id']}").json()
    assert body["recipient_name"] == "Zoë Smith"
    # Runs of blank lines collapse to one, tabs become spaces, edges trimmed.
    assert body["message"] == "line one\n\nline two with a tab"


def test_html_in_user_text_is_stored_verbatim_not_executed(client: TestClient) -> None:
    """Storage keeps the characters; escaping is the renderer's job."""
    payload = "<script>alert(1)</script>"
    created = create(client, sender_name=payload)
    body = client.get(f"/api/bouquets/{created['id']}").json()
    assert body["sender_name"] == payload


# --------------------------------------------------------------------------- #
# fetch failures
# --------------------------------------------------------------------------- #


def test_unknown_id_is_404(client: TestClient) -> None:
    response = client.get("/api/bouquets/zzzzzzzz")
    assert response.status_code == 404
    assert "detail" in response.json()


# --------------------------------------------------------------------------- #
# validation
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("count", [0, 1, 5, 11, 40])
def test_bouquet_flower_count_must_be_six_to_ten(client: TestClient, count: int) -> None:
    response = client.post("/api/bouquets", json=make_design(flowers=make_flowers(count)))
    assert response.status_code == 422


@pytest.mark.parametrize("count", [6, 7, 10])
def test_valid_flower_counts_are_accepted(client: TestClient, count: int) -> None:
    response = client.post("/api/bouquets", json=make_design(flowers=make_flowers(count)))
    assert response.status_code == 201


def test_message_over_three_hundred_chars_is_rejected(client: TestClient) -> None:
    response = client.post("/api/bouquets", json=make_design(message="x" * 301))
    assert response.status_code == 422
    assert any("message" in str(err["loc"]) for err in response.json()["detail"])


def test_message_of_exactly_three_hundred_chars_is_accepted(client: TestClient) -> None:
    response = client.post("/api/bouquets", json=make_design(message="x" * 300))
    assert response.status_code == 201


def test_unknown_flower_type_is_rejected(client: TestClient) -> None:
    flowers = make_flowers(6)
    flowers[0]["type"] = "triffid"
    response = client.post("/api/bouquets", json=make_design(flowers=flowers))
    assert response.status_code == 422


@pytest.mark.parametrize("colour", ["red", "#12345", "rgb(1,2,3)", "", "#"])
def test_bad_colour_is_rejected(client: TestClient, colour: str) -> None:
    flowers = make_flowers(6)
    flowers[0]["color"] = colour
    response = client.post("/api/bouquets", json=make_design(flowers=flowers))
    assert response.status_code == 422


def test_out_of_range_position_is_rejected(client: TestClient) -> None:
    flowers = make_flowers(6)
    flowers[0]["x"] = 5000
    response = client.post("/api/bouquets", json=make_design(flowers=flowers))
    assert response.status_code == 422


def test_unknown_fields_are_rejected(client: TestClient) -> None:
    response = client.post("/api/bouquets", json=make_design(is_admin=True))
    assert response.status_code == 422


def test_unknown_wrap_is_rejected(client: TestClient) -> None:
    response = client.post("/api/bouquets", json=make_design(wrap="bubblewrap"))
    assert response.status_code == 422


def test_oversized_body_is_rejected_before_parsing(client: TestClient) -> None:
    fat = make_design(message="x" * 10)
    fat["flowers"] = make_flowers(10)
    response = client.post(
        "/api/bouquets",
        content=b'{"padding":"' + b"a" * (settings.max_body_bytes + 100) + b'"}',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413


# --------------------------------------------------------------------------- #
# letter mode
# --------------------------------------------------------------------------- #


def test_letter_mode_allows_many_small_flowers(client: TestClient) -> None:
    response = client.post(
        "/api/bouquets",
        json=make_design(mode="letters", letter_text="HELLO", flowers=make_flowers(120)),
    )
    assert response.status_code == 201


def test_letter_mode_requires_letter_text(client: TestClient) -> None:
    response = client.post(
        "/api/bouquets",
        json=make_design(mode="letters", flowers=make_flowers(30)),
    )
    assert response.status_code == 422


@pytest.mark.parametrize("text", ["H3LLO", "hello!", "x" * 21, "emoji \U0001f339"])
def test_letter_text_must_be_letters_and_spaces(client: TestClient, text: str) -> None:
    response = client.post(
        "/api/bouquets",
        json=make_design(mode="letters", letter_text=text, flowers=make_flowers(30)),
    )
    assert response.status_code == 422


def test_letter_text_is_upper_cased(client: TestClient) -> None:
    created = create(client, mode="letters", letter_text="be kind", flowers=make_flowers(30))
    body = client.get(f"/api/bouquets/{created['id']}").json()
    assert body["letter_text"] == "BE KIND"


# --------------------------------------------------------------------------- #
# scheduled reveal
# --------------------------------------------------------------------------- #


def test_future_reveal_hides_the_contents(client: TestClient) -> None:
    when = datetime.now(UTC) + timedelta(days=3)
    created = create(client, reveal_at=when.isoformat())

    body = client.get(f"/api/bouquets/{created['id']}").json()
    assert body["locked"] is True
    assert body["recipient_name"] == "Marianne"
    assert "flowers" not in body
    assert "message" not in body
    assert datetime.fromisoformat(body["reveal_at"]) is not None


def test_past_reveal_is_already_open(client: TestClient) -> None:
    when = datetime.now(UTC) - timedelta(minutes=1)
    created = create(client, reveal_at=when.isoformat())

    body = client.get(f"/api/bouquets/{created['id']}").json()
    assert body["locked"] is False
    assert len(body["flowers"]) == 7
    assert body["message"]


def test_reveal_date_too_far_out_is_rejected(client: TestClient) -> None:
    when = datetime.now(UTC) + timedelta(days=365 * 5)
    response = client.post("/api/bouquets", json=make_design(reveal_at=when.isoformat()))
    assert response.status_code == 422


# --------------------------------------------------------------------------- #
# rate limiting
# --------------------------------------------------------------------------- #


def test_create_is_rate_limited(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "rate_limit_create", "3/minute")
    limiter.enabled = True
    limiter.reset()

    codes = [client.post("/api/bouquets", json=make_design()).status_code for _ in range(5)]
    assert codes[:3] == [201, 201, 201]
    assert codes[3:] == [429, 429]


def test_rate_limited_response_explains_itself(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_create", "1/minute")
    limiter.enabled = True
    limiter.reset()

    client.post("/api/bouquets", json=make_design())
    blocked = client.post("/api/bouquets", json=make_design())
    assert blocked.status_code == 429
    assert "minute" in blocked.json()["detail"].lower()


def test_reads_are_not_rate_limited(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    created = create(client)
    monkeypatch.setattr(settings, "rate_limit_create", "1/minute")
    limiter.enabled = True
    limiter.reset()

    for _ in range(8):
        assert client.get(f"/api/bouquets/{created['id']}").status_code == 200
        assert client.get("/api/home").status_code == 200
