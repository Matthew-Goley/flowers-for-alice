# Petal Post

A free virtual bouquet maker. Build a digital flower bouquet petal by petal,
write a note, and send it as a short link. No account, no payment, nothing to
install. Every flower, wrap and letterform in here was drawn for this project.

```
/frontend   React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + React Router 7
/backend    Python 3.12 + FastAPI + SQLModel (SQLite) + Pillow
/brand.json the product name, read by both sides
```

---

## Quick start

Two terminals. The backend first, because the frontend proxies to it.

**Terminal 1 - backend** (http://127.0.0.1:8000)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - frontend** (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the backend, so both
halves work together with no extra configuration.

No `.env` is needed for development: every setting has a working default.
`backend/.env.example` lists all of them.

---

## Commands

### Frontend (`cd frontend`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on 5173, proxying `/api` to 8000 |
| `npm run build` | Typecheck, then build to `frontend/dist` |
| `npm run preview` | Serve the built bundle |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, type-aware) |
| `npm run format` | Prettier, write |

The tsconfig is a single flat config, so a bare `tsc --noEmit` really does
check everything. There is no solution-file indirection to trip over.

### Backend (`cd backend`)

| Command | What it does |
|---|---|
| `python -m uvicorn app.main:app --reload` | Dev server with autoreload |
| `python -m pytest` | Full test suite |
| `python -m ruff check .` | Lint |
| `python -m ruff format .` | Format |

Interactive API docs are at <http://127.0.0.1:8000/docs> while the server runs.

### Dev utilities

Two scripts render the artwork to a contact sheet so it can be reviewed
without clicking through the app. Neither is part of the build.

```bash
cd frontend
npx tsx scripts/art-sheet.tsx art-sheet.svg          # 12 flowers, colour + mono
npx tsx scripts/bouquet-sheet.tsx bouquet-sheet.svg  # assembled bouquets
```

---

## Build for production

```bash
cd frontend && npm run build        # emits frontend/dist
cd ../backend && python -m uvicorn app.main:app --port 8000
```

In production FastAPI serves the built frontend itself, which is what makes
per-bouquet link previews possible: a crawler never runs the SPA, so the Open
Graph tags for `/b/{id}` have to be in the HTML as served. The backend swaps
them into the block between the `<!--petalpost:meta-->` markers in
`frontend/index.html`.

Set the public URL so those tags are absolute:

```bash
PETALPOST_PUBLIC_BASE_URL=https://your-domain.example
```

---

## How it works

### The four-step builder

1. **Choose flowers** - twelve kinds, any colour, 6 to 10 stems. The counter,
   the Next button and the screen-reader announcement all read from one
   validation function (`flowerCountStatus`).
2. **Arrange** - flowers are laid out automatically along one or two
   elliptical arcs to make a fan. Shuffle for a new composition, drag any
   bloom, or focus one and nudge it with the arrow keys. Undo and redo, with
   Ctrl/Cmd+Z.
3. **Wrap and message** - five papers, six ribbons, recipient, sender, a note
   capped at 300 characters, line-art mode, and an optional reveal date.
4. **Share** - posts once, returns a short link, offers copy, the native share
   sheet on mobile, and a PNG download.

**Letter bouquets** are the same flow in a different mode: type up to twenty
characters and each letter is traced out in small blooms. The glyphs are
hand-plotted polylines in `frontend/src/lib/letters.ts`.

### Where the bouquet is drawn

One component, `BouquetCanvas`, renders a square `0 0 100 100` SVG. The
builder, the recipient page, the share preview and the PNG export all use it,
which is the only reason the thing the sender arranges is certain to be the
thing the recipient opens.

Two details in the flower art are load-bearing and easy to undo by accident:

- **Mono petals are filled with an opaque paper colour, not `none`.** With
  `fill="none"` every petal ring shows through every other one and a layered
  flower renders as a spirograph.
- **That colour, and the ink colour, are passed as props rather than read from
  CSS variables.** The PNG export serialises the live SVG and loads it as a
  standalone image, which inherits no CSS from the page. A `var()` in there
  exports as black.

### Scheduled bouquets

A bouquet with a reveal date is withheld by the server, not hidden by the
client. Until the date, `GET /api/bouquets/{id}` returns only enough to draw a
wrapped parcel and a countdown; the flowers and the message are never sent, so
there is nothing to find in devtools. The preview image flips over on the same
schedule, and is cached separately for each state.

---

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | Liveness, app name, version |
| `POST` | `/api/bouquets` | Validates and stores a design; returns `{ id, url_path }`. Rate limited. |
| `GET` | `/api/bouquets/{id}` | The design, or the locked summary if its reveal date has not passed. 404 otherwise. |
| `GET` | `/api/og/{id}` | 1200x630 PNG social preview, rendered once and cached on disk |

The id is 8 characters from an alphabet with no look-alikes (no `0`/`O`, no
`1`/`l`/`I`), so it survives being read aloud or typed from a screenshot.

**Abuse limits.** `POST` is capped at 20 per minute per IP (slowapi), request
bodies over 64 KB are rejected before parsing, and every user string is
normalised and stripped of control and zero-width characters on the way in.
Stored text keeps its original characters; escaping happens where it is
rendered into HTML, which is only in the Open Graph tags.

### Social previews

`/api/og/{id}` is painted with Pillow, not by rasterising the SVG. cairosvg
would need native cairo/GTK libraries, which are awkward on Windows and heavy
in a deploy image. The painter in `backend/app/og_render.py` re-draws the
stored geometry with a small set of petal primitives that echo the SVG
components. It is not pixel-identical to the browser, and does not need to be;
it needs to be recognisably *this* bouquet at thumbnail size in iMessage.

---

## Testing

```bash
cd backend  && python -m pytest     # 77 tests
cd frontend && npm test             # 105 tests
```

**Backend** covers creating and fetching, 404s, every validation rule
(flower counts, message length, colour format, unknown enum values, unknown
fields, oversized bodies), text sanitisation, letter mode, scheduled reveals,
rate limiting, OG rendering for every flower, wrap and greenery, and the
escaping of user text into meta tags.

**Frontend** covers the flower-count validation and the whole builder reducer,
the arrangement algorithm (determinism, bounds, row splitting, shuffle,
dragging), the letter glyph layout, undo/redo semantics, and a render pass
over every route to catch anything a type checker cannot see.

The undo/redo tests exist because of a real bug: an earlier version of the
hook kept its own copy of the present value, drifted out of step with the
reducer, and left redo replaying the state it had just undone. It is now
driven by the live value its caller owns.

---

## Deploying

The app is one Python process serving an API, a SQLite file and a folder of
static assets, so most hosts will take it as-is.

1. `cd frontend && npm run build`
2. Ship the repository with `frontend/dist` in place
3. Run `uvicorn app.main:app --host 0.0.0.0 --port $PORT` from `backend/`
4. Set `PETALPOST_PUBLIC_BASE_URL` to the public origin
5. Give `backend/data/` a persistent volume: it holds `petalpost.db` and the
   cached preview images

Notes for anything larger than a small instance:

- **SQLite is the default, not a requirement.** Point
  `PETALPOST_DATABASE_URL` at Postgres and the SQLModel layer is unchanged.
- **Rate limiting is in-process.** With more than one worker the effective
  limit multiplies by the worker count; give slowapi a shared Redis backend if
  that matters.
- **The OG cache is a local folder.** On ephemeral disks it simply re-renders,
  which costs a few hundred milliseconds per bouquet.

---

## Renaming the app

`brand.json` at the repository root is the one place:

```json
{ "name": "Petal Post", "tagline": "...", "domain": "...", "supportEmail": "..." }
```

Vite inlines it at config time and the backend reads it at import, so both
sides follow. Restart the dev server after editing it.

---

## Conventions

- **Strict TypeScript, no `any`.** `@typescript-eslint/no-explicit-any` is an
  error, and the lint config is type-aware.
- **The bouquet schema is defined twice and must stay in step**:
  `backend/app/schemas.py` plus `backend/app/catalog.py` on the server, and
  `frontend/src/types/bouquet.ts` on the client. Adding a flower, wrap or
  greenery style means touching both, plus the OG painter.
- **Accessibility is part of the feature, not a pass at the end.** Real radio
  inputs behind the choice groups, a visible focus ring everywhere, arrow-key
  arranging, a skip link, focus moved to the step heading on navigation, and
  `prefers-reduced-motion` honoured in both CSS and Framer Motion.
- Original artwork and copy throughout. Nothing here is traced, downloaded or
  adapted from another site.
