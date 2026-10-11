"""Create, read and preview bouquets."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse
from sqlmodel import Session

from ..config import settings
from ..db import get_session
from ..models import Bouquet
from ..og_render import render_to_path
from ..rate_limit import create_limit, limiter
from ..schemas import BouquetCreated, BouquetDesign, BouquetLocked, BouquetOut

router = APIRouter(prefix="/api", tags=["bouquets"])


def load_bouquet(bouquet_id: str, session: Session) -> Bouquet:
    row = session.get(Bouquet, bouquet_id)
    if row is None:
        raise HTTPException(status_code=404, detail="That bouquet has wilted, or never existed.")
    return row


def design_of(row: Bouquet) -> dict:
    return json.loads(row.payload_json)


def is_locked(row: Bouquet, *, now: datetime | None = None) -> bool:
    """True while a scheduled bouquet is still waiting for its reveal date."""
    if row.reveal_at is None:
        return False
    moment = row.reveal_at
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=UTC)
    return moment > (now or datetime.now(UTC))


@router.post("/bouquets", response_model=BouquetCreated, status_code=201)
@limiter.limit(create_limit)
def create_bouquet(
    request: Request,
    design: BouquetDesign,
    session: Session = Depends(get_session),
) -> BouquetCreated:
    row = Bouquet(
        mode=design.mode,
        payload_json=design.model_dump_json(),
        reveal_at=design.reveal_at,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return BouquetCreated(id=row.id, url_path=f"/b/{row.id}")


@router.get(
    "/bouquets/{bouquet_id}",
    response_model=BouquetOut | BouquetLocked,
    responses={404: {"description": "No such bouquet"}},
)
def read_bouquet(
    bouquet_id: str,
    response: Response,
    session: Session = Depends(get_session),
) -> BouquetOut | BouquetLocked:
    row = load_bouquet(bouquet_id, session)
    design = design_of(row)

    if is_locked(row):
        # Withhold the flowers and the message entirely: a sealed bouquet must
        # not be readable by opening devtools before its reveal date.
        response.headers["Cache-Control"] = "no-store"
        return BouquetLocked(
            id=row.id,
            created_at=row.created_at,
            mode=design.get("mode", "bouquet"),
            reveal_at=row.reveal_at,  # type: ignore[arg-type]
            wrap=design.get("wrap", "kraft"),
            ribbon=design.get("ribbon", "#e4a0b7"),
            recipient_name=design.get("recipient_name", ""),
            sender_name=design.get("sender_name", ""),
        )

    response.headers["Cache-Control"] = "public, max-age=300"
    return BouquetOut(id=row.id, created_at=row.created_at, locked=False, **design)


@router.get(
    "/og/{bouquet_id}",
    response_class=FileResponse,
    responses={
        200: {"content": {"image/png": {}}, "description": "1200x630 preview"},
        404: {"description": "No such bouquet"},
    },
)
def bouquet_og_image(
    bouquet_id: str,
    session: Session = Depends(get_session),
) -> FileResponse:
    """A social preview of the bouquet, cached on disk after the first render."""
    row = load_bouquet(bouquet_id, session)
    locked = is_locked(row)

    # Locked and unlocked previews are different pictures, so they need
    # different cache entries: the file name carries the state.
    suffix = "locked" if locked else "open"
    path = settings.og_cache_dir / f"{row.id}-{suffix}.png"

    if not path.exists():
        render_to_path(
            design_of(row),
            path,
            app_name=settings.app_name,
            tagline=settings.tagline,
            hide_contents=locked,
            reveal_at=row.reveal_at,
        )

    return FileResponse(
        path,
        media_type="image/png",
        headers={
            # Short cache while locked so the preview flips over on reveal day.
            "Cache-Control": "public, max-age=600"
            if locked
            else "public, max-age=31536000, immutable"
        },
    )
