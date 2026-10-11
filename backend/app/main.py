"""Petal Post API.

In development this process only serves `/api/*`; Vite serves the UI and proxies
across. In production the built frontend is served from here too, which is what
lets `/b/{id}` ship real per-bouquet Open Graph tags -- crawlers do not run the
SPA, so the tags have to be in the first byte of HTML.
"""

from __future__ import annotations

import html
import json
import logging
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import UTC

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlmodel import Session

from .config import settings
from .db import engine, init_db
from .models import Bouquet
from .rate_limit import limiter
from .routes import bouquets as bouquets_routes
from .schemas import Health

VERSION = "1.0.0"

log = logging.getLogger("petalpost")

# The head of index.html carries a fallback <title> and description between
# these markers so the page is still sane when Vite serves it in development.
# In production the whole block, markers included, is swapped for real tags.
META_OPEN = "<!--petalpost:meta-->"
META_CLOSE = "<!--/petalpost:meta-->"
META_BLOCK = re.compile(
    re.escape(META_OPEN) + ".*?" + re.escape(META_CLOSE),
    re.DOTALL,
)


def _inject_meta(page: str, tags: str) -> str:
    """Swap the placeholder block for real tags, leaving the rest untouched."""
    replaced, count = META_BLOCK.subn(lambda _: tags, page, count=1)
    if count:
        return replaced
    # An index.html without the markers still renders; it just gets no tags.
    log.warning("index.html is missing the %s block, serving it unchanged", META_OPEN)
    return page


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    settings.og_cache_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=f"{settings.app_name} API",
    version=VERSION,
    description="Build a digital bouquet, add a note, share a short link.",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": "That is a lot of bouquets at once. Give it a minute and try again.",
            "limit": str(exc.detail),
        },
    )


@app.middleware("http")
async def limit_body_size(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Reject oversized uploads before Pydantic ever sees them."""
    if request.method in {"POST", "PUT", "PATCH"}:
        declared = request.headers.get("content-length")
        if declared is not None:
            try:
                if int(declared) > settings.max_body_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "That bouquet is too large to send."},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400, content={"detail": "Malformed Content-Length."}
                )
    return await call_next(request)


app.include_router(bouquets_routes.router)


@app.get("/api/health", response_model=Health, tags=["meta"])
def health() -> Health:
    return Health(status="ok", app=settings.app_name, version=VERSION)


# --------------------------------------------------------------------------- #
# production static hosting
# --------------------------------------------------------------------------- #

DIST = settings.frontend_dist
INDEX = DIST / "index.html"


def _excerpt(text: str, limit: int = 160) -> str:
    flat = " ".join(text.split())
    if len(flat) <= limit:
        return flat
    return flat[: limit - 1].rstrip() + "…"


def _meta_tags(bouquet_id: str) -> str:
    """Per-bouquet Open Graph tags, or the site defaults if the id is unknown."""
    app_name = settings.app_name
    base = settings.public_base_url.rstrip("/")
    url = f"{base}/b/{bouquet_id}"
    image = f"{base}/api/og/{bouquet_id}"

    title = f"Someone sent you flowers | {app_name}"
    description = settings.tagline

    with Session(engine) as session:
        row = session.get(Bouquet, bouquet_id)

    if row is not None:
        design = json.loads(row.payload_json)
        recipient = str(design.get("recipient_name") or "").strip()
        sender = str(design.get("sender_name") or "").strip()
        message = str(design.get("message") or "").strip()

        locked = bouquets_routes.is_locked(row)
        who = f"Flowers for {recipient}" if recipient else "Someone sent you flowers"
        title = f"{who} | {app_name}"

        if locked and row.reveal_at is not None:
            when = row.reveal_at
            if when.tzinfo is None:
                when = when.replace(tzinfo=UTC)
            description = f"A bouquet that opens on {when.strftime('%d %B %Y').lstrip('0')}."
        elif message:
            description = _excerpt(message)
        elif sender:
            description = f"A hand-arranged bouquet from {sender}."

    esc = html.escape
    return "\n    ".join(
        [
            f"<title>{esc(title)}</title>",
            f'<meta name="description" content="{esc(description, quote=True)}" />',
            f'<meta property="og:site_name" content="{esc(app_name, quote=True)}" />',
            '<meta property="og:type" content="website" />',
            f'<meta property="og:title" content="{esc(title, quote=True)}" />',
            f'<meta property="og:description" content="{esc(description, quote=True)}" />',
            f'<meta property="og:url" content="{esc(url, quote=True)}" />',
            f'<meta property="og:image" content="{esc(image, quote=True)}" />',
            '<meta property="og:image:width" content="1200" />',
            '<meta property="og:image:height" content="630" />',
            '<meta name="twitter:card" content="summary_large_image" />',
            f'<meta name="twitter:title" content="{esc(title, quote=True)}" />',
            f'<meta name="twitter:description" content="{esc(description, quote=True)}" />',
            f'<meta name="twitter:image" content="{esc(image, quote=True)}" />',
        ]
    )


_MISSING_BUILD = (
    "The frontend has not been built yet.\n\n"
    "In development, open the Vite server instead (npm run dev in /frontend).\n"
    "For production, run `npm run build` in /frontend and restart this server."
)


if DIST.is_dir():
    # Vite emits hashed files under /assets; everything else in dist (favicon,
    # robots.txt) is served by the catch-all below.
    assets = DIST / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/b/{bouquet_id}", response_class=HTMLResponse, include_in_schema=False)
    def shared_bouquet_page(bouquet_id: str) -> HTMLResponse:
        page = _inject_meta(INDEX.read_text(encoding="utf-8"), _meta_tags(bouquet_id))
        return HTMLResponse(page, headers={"Cache-Control": "no-cache"})

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> Response:
        candidate = (DIST / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(DIST.resolve()):
            return Response(
                content=candidate.read_bytes(),
                media_type=_guess_type(candidate.suffix),
            )
        page = _inject_meta(INDEX.read_text(encoding="utf-8"), _site_meta())
        return HTMLResponse(page)

    def _site_meta() -> str:
        esc = html.escape
        name = esc(settings.app_name)
        tagline = esc(settings.tagline, quote=True)
        base = settings.public_base_url.rstrip("/")
        return "\n    ".join(
            [
                f"<title>{name} | {tagline}</title>",
                f'<meta name="description" content="{tagline}" />',
                f'<meta property="og:site_name" content="{name}" />',
                f'<meta property="og:title" content="{name}" />',
                f'<meta property="og:description" content="{tagline}" />',
                f'<meta property="og:url" content="{esc(base, quote=True)}" />',
                '<meta name="twitter:card" content="summary_large_image" />',
            ]
        )

    def _guess_type(suffix: str) -> str:
        return {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".webp": "image/webp",
            ".ico": "image/x-icon",
            ".json": "application/json",
            ".txt": "text/plain; charset=utf-8",
            ".woff2": "font/woff2",
        }.get(suffix.lower(), "application/octet-stream")

else:  # pragma: no cover - depends on whether the UI has been built

    @app.get("/", response_class=PlainTextResponse, include_in_schema=False)
    def no_build() -> PlainTextResponse:
        log.warning("frontend dist not found at %s", DIST)
        return PlainTextResponse(_MISSING_BUILD, status_code=503)
