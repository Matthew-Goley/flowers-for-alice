"""Engine and session plumbing."""

from __future__ import annotations

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import settings

settings.data_dir.mkdir(parents=True, exist_ok=True)

# `check_same_thread` is required because FastAPI runs sync endpoints on a
# threadpool, so a connection can be handed to a different thread than it was
# created on.
engine = create_engine(
    settings.resolved_database_url(),
    connect_args={"check_same_thread": False},
    echo=False,
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
