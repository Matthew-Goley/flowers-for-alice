# Bouquet

A single-page bouquet display. The home page shows one bouquet, or a single
flower before anyone has made one. A menu in the bottom-left corner opens a
code prompt; the right code unlocks the builder, and the bouquet built there
replaces the one on the home page for everyone. Every flower, wrap and
letterform in here was drawn for this project.

```
/frontend   React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + React Router 7
/backend    Python 3.12 + FastAPI + SQLModel (SQLite)
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

Open <http://localhost:5173>. The create code defaults to `520`.

No `.env` is needed for development: every setting has a working default.
`backend/.env.example` lists all of them. **Set `PETALPOST_CREATE_CODE` in
production**: anyone with the code can replace the home page bouquet.

---

## Commands

### Frontend (`cd frontend`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on 5173, proxying `/api` to 8000 |
| `npm run build` | Typecheck, then build to `frontend/dist` |
| `npm test` | Vitest, single run |
| `npm run lint` | ESLint (flat config, type-aware) |
| `npm run format` | Prettier, write |

### Backend (`cd backend`)

| Command | What it does |
|---|---|
| `python -m uvicorn app.main:app --reload` | Dev server with autoreload |
| `python -m pytest` | Full test suite |
| `python -m ruff check .` / `ruff format .` | Lint / format |

Interactive API docs are at <http://127.0.0.1:8000/docs> while the server runs.

### Art review

```bash
cd frontend
npx tsx scripts/art-sheet.tsx art-sheet.svg          # 12 flowers, colour + mono
npx tsx scripts/bouquet-sheet.tsx bouquet-sheet.svg  # assembled bouquets
```

---

## How it works

**Home (`/`)** fetches `GET /api/home`, which returns the most recently created
bouquet, or `null`. On the first visit a wall of flowers covers the screen and
falls away to reveal it. A bouquet with a future reveal date is drawn wrapped
with a countdown; the server withholds its flowers and message until then.

**Arranging.** Drag a flower to move it. Hold R and move the mouse to turn the
selected flower (or the one being dragged). Undo and redo with Ctrl/Cmd+Z.

**The code.** The menu's code prompt posts to `POST /api/unlock`. On success the
code is kept in `sessionStorage` and the browser goes to `/create`. That check
only gates the UI: `POST /api/bouquets` requires the code again in an
`X-Create-Code` header, so the home page cannot be replaced from devtools.
Both endpoints are rate limited.

**The builder (`/create`)** is four steps: choose flowers (6 to 10 stems, or a
letter bouquet), arrange (drag, shuffle, undo/redo), wrap and message, then
finish, which saves the bouquet and returns to the home page.

---

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | Liveness and version |
| `GET` | `/api/home` | The newest bouquet (open or locked summary), or `null` |
| `POST` | `/api/unlock` | `{ code }`; 204 if right, 403 if not. Rate limited. |
| `POST` | `/api/bouquets` | Needs `X-Create-Code`. Validates and stores a design; returns `{ id }`. Rate limited. |
| `GET` | `/api/bouquets/{id}` | One bouquet by id, or 404 |

---

## Build for production

```bash
cd frontend && npm run build        # emits frontend/dist
cd ../backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

FastAPI serves the built frontend itself. Give `backend/data/` a persistent
volume (it holds `petalpost.db`), and restart uvicorn after the first build:
the static routes are registered only if `dist` exists at import time.
