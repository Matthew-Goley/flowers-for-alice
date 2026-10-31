"""Bouquet API.

In development this process only serves `/api/*`; Vite serves the UI and proxies
across. In production the built frontend is served from here too.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from .config import settings
from .db import init_db
from .rate_limit import limiter
from .routes import bouquets as bouquets_routes
from .schemas import Health

VERSION = "2.0.0"

log = logging.getLogger("petalpost")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(
    title="Bouquet API",
    version=VERSION,
    description="Build a digital bouquet and put it on the home page.",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Create-Code"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many tries at once. Give it a minute and try again.",
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
    return Health(status="ok", version=VERSION)


# --------------------------------------------------------------------------- #
# production static hosting
# --------------------------------------------------------------------------- #

DIST = settings.frontend_dist
INDEX = DIST / "index.html"

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

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> Response:
        candidate = (DIST / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(DIST.resolve()):
            return FileResponse(candidate)
        return FileResponse(INDEX, media_type="text/html", headers={"Cache-Control": "no-cache"})

else:  # pragma: no cover - depends on whether the UI has been built

    @app.get("/", response_class=PlainTextResponse, include_in_schema=False)
    def no_build() -> PlainTextResponse:
        log.warning("frontend dist not found at %s", DIST)
        return PlainTextResponse(_MISSING_BUILD, status_code=503)
