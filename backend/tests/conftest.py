"""Test fixtures.

Each test gets its own SQLite file and its own OG cache directory, so nothing
leaks between tests and the developer's real `backend/data` is never touched.
"""

from __future__ import annotations

import math
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app import db as db_module
from app.config import settings
from app.db import get_session
from app.main import app
from app.rate_limit import limiter


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    engine = create_engine(
        f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

    # `main._meta_tags` reaches for the module-level engine directly.
    monkeypatch.setattr(db_module, "engine", engine)
    monkeypatch.setattr("app.main.engine", engine)
    monkeypatch.setattr(settings, "data_dir", tmp_path)

    def override() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override
    yield
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> Iterator[None]:
    """Rate limit state is process-global; start every test with a clean slate."""
    limiter.reset()
    limiter.enabled = False
    yield
    limiter.reset()
    limiter.enabled = settings.rate_limit_enabled


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def make_flowers(count: int = 7, kind: str = "rose") -> list[dict]:
    """A plausible fan of blooms, the same shape the frontend posts."""
    flowers = []
    for i in range(count):
        angle = math.radians(-150 + (120 / max(1, count - 1)) * i)
        flowers.append(
            {
                "type": kind,
                "color": "#e4738f",
                "x": round(50 + 26 * math.cos(angle), 2),
                "y": round(56 + 22 * math.sin(angle), 2),
                "rotation": round((i * 17.0) % 360, 2),
                "scale": 1.0,
            }
        )
    return flowers


def make_design(**overrides: object) -> dict:
    design: dict = {
        "mode": "bouquet",
        "flowers": make_flowers(),
        "greenery": "eucalyptus",
        "wrap": "kraft",
        "ribbon": "#e4a0b7",
        "mono": False,
        "recipient_name": "Marianne",
        "sender_name": "Matthew",
        "message": "Happy birthday. Hope today is a slow, sunny one.",
    }
    design.update(overrides)
    return design
