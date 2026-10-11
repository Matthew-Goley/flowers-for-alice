# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A free virtual bouquet maker: build a digital bouquet, write a note, share it as
a short link. Standalone repo, no relation to the other projects in `_Dev_ALL/`.

Three names for the same thing, so don't be thrown: the directory is `FFA`, the
git remote is `flowers-for-alice`, and the product is **Petal Post** (a working
name, defined in `brand.json`).

All artwork and copy are original to this project and must stay that way. The
brief explicitly ruled out copying anything from digi-bouquet.com; nothing here
is traced, downloaded or adapted from another site.

## Layout

```
/frontend   React 19 + TypeScript 6 + Vite 8 + Tailwind v4 + React Router 7
/backend    Python 3.12 + FastAPI + SQLModel (SQLite) + Pillow
/brand.json product name and tagline, read by both halves
```

In dev these are two processes and Vite proxies `/api` to port 8000. In prod
FastAPI serves `frontend/dist` itself.

## Commands

Backend (`cd backend`, venv at `.venv`):

```bash
.venv/Scripts/activate                       # Windows
python -m uvicorn app.main:app --reload      # port 8000, docs at /docs
python -m pytest                             # 77 tests
python -m pytest tests/test_og.py::test_mono_and_letters_modes_render   # one test
python -m ruff check .  &&  python -m ruff format .
```

Frontend (`cd frontend`):

```bash
npm run dev          # port 5173, proxies /api to 8000
npm run build        # tsc --noEmit, then vite build
npm test             # vitest, 105 tests
npx vitest run -t "undo returns the previous value"   # one test, by name
npm run lint         # ESLint, type-aware
npm run format       # Prettier
```

Both servers must be up for the full app; the backend alone serves the API, and
`npm run dev` alone gives a UI whose `/api` calls fail.

The tsconfig is a single flat config, deliberately, so a bare `tsc --noEmit`
really does check everything. (Contrast `_lens/lens-app`, where the root
tsconfig is a solution file and a bare `tsc --noEmit` silently checks nothing.)

Art review without clicking through the app:

```bash
cd frontend
npx tsx scripts/art-sheet.tsx out.svg        # 12 flowers, colour + mono
npx tsx scripts/bouquet-sheet.tsx out.svg    # assembled bouquets
```

Use `npx tsx`, not `jiti` (no JSX) and not `vite-node` (Vite 8 ships no esbuild
binary and vitest 5 does not pull vite-node in).

## Architecture

### One canvas, six surfaces

`frontend/src/components/BouquetCanvas.tsx` renders a square `0 0 100 100` SVG
and is used by the arrange step, the wrap step, the share step, the landing
hero, the recipient page and the PNG export. That single component is the only
reason the bouquet the sender arranges is guaranteed to be the bouquet the
recipient opens. Flower positions are `x`/`y` in that 0-100 space; blooms paint
sorted by `y`, so lower flowers overlap higher ones.

### The bouquet is drawn twice, on purpose

The browser draws SVG. The server draws the same stored geometry again with
Pillow in `backend/app/og_render.py`, for the `/api/og/{id}` link preview.
cairosvg was rejected: it needs native cairo/GTK, which is painful on Windows
and heavy in a deploy image. The Pillow painter is not pixel-identical and does
not need to be, but it mirrors the layout constants (`WRAP_TOP_Y`,
`WRAP_BOTTOM_Y`, the binding point, the 0-100 space). Change the sleeve
geometry on one side and the preview drifts from the real thing.

### The schema lives in four places and must stay in step

| File | Holds |
|---|---|
| `backend/app/catalog.py` | the enums and the count limits |
| `backend/app/schemas.py` | Pydantic validation, the authority |
| `frontend/src/types/bouquet.ts` | the TypeScript mirror, incl. the snake_case wire types |
| `backend/app/og_render.py` | `FLOWER_SPECS`, one entry per flower |

Adding a flower, wrap or greenery style means touching all four. `lib/api.ts` is
the only module allowed to know the API speaks snake_case.

### Scheduled bouquets are enforced by the server

A bouquet with a future `reveal_at` returns `BouquetLocked` from
`GET /api/bouquets/{id}`: no flowers, no message. The countdown is real, not a
client-side curtain, and there is nothing to find in devtools. The OG image
caches locked and open states under separate filenames so the preview flips
over on reveal day.

### Link previews

Crawlers do not run the SPA, so `/b/{id}` is served by FastAPI with real Open
Graph tags swapped into the block between the `<!--petalpost:meta-->` and
`<!--/petalpost:meta-->` markers in `frontend/index.html`. Those markers wrap a
dev fallback title; replacing the whole block (not just the opening marker) is
what keeps the served page from carrying two `<title>` tags.

## Invariants that are easy to break

**Mono flowers fill with an opaque paper colour, never `fill="none"`.** With
`none`, every petal ring shows through every other one and a layered flower
renders as a spirograph. The inner rings are supposed to occlude the outer ones.

**`paper` and `ink` are props, not CSS variables.** The PNG export serialises
the live SVG and loads it as a standalone image, which inherits no CSS from the
page. A `var(--color-surface)` in the art exports as black. This is why
`FlowerArtProps` carries `paper` and `BouquetCanvas` carries `ink`.

**Arrangement must stay deterministic.** `lib/random.ts` is seeded; `newSeed()`
is the only sanctioned `Math.random` in the art path. Same stems plus same seed
must always give the same bouquet, or undo, draft restore and the shared link
stop agreeing with each other. (`MusicToggle` uses `Math.random` for its melody,
which is fine: nothing persists it.)

**`useHistory` does not own the value it tracks.** It is handed the live flower
list on every render and `record(before)` is called with the pre-change value.
An earlier version kept its own "present", drifted from the reducer the moment
an action computed a value it had not seen, and left redo replaying the state it
had just undone. `src/__tests__/history.test.ts` exists to keep that fixed.

**`StepArrange` relies on the wizard unmounting it.** `AnimatePresence
mode="wait"` keyed on the step index destroys each step on navigation, which is
why the undo stack needs no manual reset. If that keying changes, history will
leak across bouquets.

**These file splits exist for `react-refresh/only-export-components`; do not
merge them back:** `flowerGeometry.ts` / `flowerKit.tsx`, `wrapTokens.ts` /
`WrapPaper.tsx`, `lib/theme.ts` / `lib/ThemeProvider.tsx`. The rule only
tolerates primitive constants alongside components, so functions and object
constants have to live in the non-component file.

**The share step posts exactly once**, guarded by a ref against StrictMode's
double effect. Removing the guard creates two bouquets per visit.

**Restart uvicorn after the first `npm run build`.** `app/main.py` registers the
static and `/b/{id}` routes inside `if DIST.is_dir():`, evaluated at import. A
server started before `dist` existed will 503 on `/` until restarted.

**ESLint's typed configs are scoped to `**/*.{ts,tsx}`** because
`eslint.config.js` is plain JS and belongs to no tsconfig; unscoped, the
type-aware rules fail to load for it and the whole lint run dies.

## Tests

Backend covers create/fetch/404, every validation rule, sanitisation, letter
mode, scheduled reveals, rate limiting, OG rendering across all twelve flowers
and five wraps, and the escaping of user text into meta tags.

Frontend covers the builder reducer and flower-count validation, the
arrangement algorithm, letter glyph layout, undo/redo, and a render pass over
every route via the real router (`render.test.tsx`) to catch what types cannot.

Two testing notes: `conftest.py` disables the rate limiter by default and the
limit string is read through a callable so a test can tighten it at runtime;
and there is no Testing Library, just a dozen-line hook harness in
`src/__tests__/testUtils.tsx`.

## Renaming the product

`brand.json` at the root is the single edit point. Vite inlines it via `define`
at config time and the backend reads it at import, so both sides follow. The
dev server needs a restart to pick up a change.
