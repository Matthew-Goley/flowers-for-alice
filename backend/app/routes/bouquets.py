"""Unlock the builder, create bouquets and read back the one on the home page."""

from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlmodel import Session, col, select

from ..config import settings
from ..db import get_session
from ..models import Bouquet
from ..rate_limit import create_limit, limiter, unlock_limit
from ..schemas import BouquetCreated, BouquetDesign, BouquetLocked, BouquetOut, UnlockRequest

router = APIRouter(prefix="/api", tags=["bouquets"])

WRONG_CODE = "That code is not right."


def code_matches(code: str | None) -> bool:
    if not code:
        return False
    return secrets.compare_digest(code.encode(), settings.create_code.encode())


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


def present(row: Bouquet, response: Response) -> BouquetOut | BouquetLocked:
    """The public view of a bouquet, with the contents withheld while it is sealed."""
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

    response.headers["Cache-Control"] = "no-cache"
    return BouquetOut(id=row.id, created_at=row.created_at, locked=False, **design)


@router.post("/unlock", status_code=204, responses={403: {"description": "Wrong code"}})
@limiter.limit(unlock_limit)
def unlock(request: Request, body: UnlockRequest) -> Response:
    """Check the create code before the builder opens.

    This only gates the UI. The code is checked again on create, which is the
    check that actually protects the home page.
    """
    if not code_matches(body.code):
        raise HTTPException(status_code=403, detail=WRONG_CODE)
    return Response(status_code=204)


@router.post(
    "/bouquets",
    response_model=BouquetCreated,
    status_code=201,
    responses={403: {"description": "Missing or wrong create code"}},
)
@limiter.limit(create_limit)
def create_bouquet(
    request: Request,
    design: BouquetDesign,
    x_create_code: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> BouquetCreated:
    if not code_matches(x_create_code):
        raise HTTPException(status_code=403, detail=WRONG_CODE)

    row = Bouquet(
        mode=design.mode,
        payload_json=design.model_dump_json(),
        reveal_at=design.reveal_at,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return BouquetCreated(id=row.id)


@router.get(
    "/home",
    response_model=BouquetOut | BouquetLocked | None,
    responses={200: {"description": "The newest bouquet, or null before the first one"}},
)
def read_home(
    response: Response,
    session: Session = Depends(get_session),
) -> BouquetOut | BouquetLocked | None:
    """The bouquet on the home page: whichever was created most recently."""
    row = session.exec(select(Bouquet).order_by(col(Bouquet.created_at).desc()).limit(1)).first()
    if row is None:
        response.headers["Cache-Control"] = "no-cache"
        return None
    return present(row, response)


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
    return present(load_bouquet(bouquet_id, session), response)
