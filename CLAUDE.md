# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page bouquet display. The home page shows the most recently created
bouquet, or one stemmed rose before any exists. A menu in the bottom-left
corner opens a code prompt; the right code unlocks the four-step builder, and
finishing it replaces the home page bouquet for everyone. Standalone repo, no
relation to the other projects in `_Dev_ALL/`.

The page itself carries **no product branding**: no name, logo, tagline or
footer, and `render.test.tsx` asserts that "Flowers for Alice" and "Petal Post"
never render into the app. The one exception, by request, is the browser tab:
`index.html` sets the title to "Flowers for Alice" and the icon to
`public/heart.svg`. The git remote is `flowers-for-alice`.

Internal identifiers still carry the old working title on purpose and should be
left alone: the `PETALPOST_` env prefix, the `petalpost:*` storage keys and
`petalpost.db`. Renaming them would invalidate saved drafts, break any deployed
`.env`, and orphan an existing database, all for something no user ever sees.

All artwork and copy are original to this project and must stay that way. The
brief explicitly ruled out copying anything from digi-bouquet.com; nothing here
is traced, downloaded or adapted from another site.

## Layout

```
/frontend   React 19 + TypeScript 6 + Vite 8 + Tailwind v4 + React Router 7
/backend    Python 3.12 + FastAPI + SQLModel (SQLite)
```

In dev these are two processes and Vite proxies `/api` to port 8000. In prod
FastAPI serves `frontend/dist` itself.

## Commands

Backend (`cd backend`, venv at `.venv`):

```bash
.venv/Scripts/activate                       # Windows
python -m uvicorn app.main:app --reload      # port 8000, docs at /docs
python -m pytest                             # 53 tests
python -m pytest tests/test_bouquets.py::test_home_shows_the_newest_bouquet   # one test
python -m ruff check .  &&  python -m ruff format .
```

Frontend (`cd frontend`):

```bash
npm run dev          # port 5173, proxies /api to 8000
npm run build        # tsc --noEmit, then vite build
npm test             # vitest, 110 tests
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

### Two routes

| Route | File | What it is |
|---|---|---|
| `/` | `pages/Home.tsx` | The bouquet from `GET /api/home`, or `LoneFlower` when that is `null`. Plus `HomeMenu` |
| `/create` | `pages/Create.tsx` | The builder. Redirects to `/` unless a code is in `sessionStorage` |

Anything else redirects to `/`. Home renders nothing while loading, so the lone
rose never flashes up ahead of a bouquet that is on its way.

### The flower wall is the reveal

On the first visit of a page load, `components/FlowerWall.tsx` covers the
screen with a grid of overlapping blooms over a white ground. It waits for the
home fetch to settle (and at least `MIN_HOLD`), then every bloom falls, top
rows first. Rows are emitted bottom-first in the DOM so each upper row paints
over the ones below as it falls. The bouquet underneath is drawn whole; nothing
is staged one bloom at a time any more. A module-level `wallPlayed` flag in
`Home.tsx` stops the wall replaying when the user comes back from `/create`. It
is set only when the wall finishes, because StrictMode mounts twice. Reduced
motion skips the wall.

The wall is tuned for phones, and each of these was a measured stall. Keep
them:

- **The fall runs on `element.animate()`, not a CSS class.** Toggling a class
  on the container (or on every flower) restyles thousands of SVG nodes on the
  first frame of the fall.
- **The bloom elements are built once in a `useMemo`.** Starting the fall then
  re-renders only the container, not every flower's SVG.
- **The white backing is 98.5% opaque, not 100%.** A fully opaque cover lets
  the browser skip painting the bouquet until it is revealed, and that first
  paint lands on the animation.
- **`.wall-flower` has `will-change: transform`.** It is promoted to a layer
  while standing still, not as it starts moving.
- **On touch or narrow screens the wall renders `lite`** (`ArtDetailContext`):
  no ring shadows, detail lines or lighting. Shapes and colours are unchanged,
  and the bouquet itself is always full detail.

Headless browsers with a virtual time budget do not advance animations, so
check it with real-time frames, not `--virtual-time-budget`.

### Rotating a flower: hold R and move the mouse, or twist with two fingers

In the arrange step, `BouquetCanvas` listens for R on `window` (ignored while
typing in a field, or with Ctrl/Meta/Alt held). While R is held, horizontal
mouse travel turns the selected flower, or the one being dragged, at
`ROTATE_DEGREES_PER_PX`. It uses horizontal travel, not the angle around the
flower, because the cursor usually sits on the flower and an angle reading
there spins wildly. One hold of R is one undo step: `StepArrange` shares the
`dragStart` ref between move and rotate, and releasing R (or the window
blurring) calls `onMoveEnd`. Angles go through `normaliseAngle` into
(-180, 180], inside the API's -360 to 360 limit. All pointer moves are handled
on the `<svg>`; pointer capture retargets a drag to the flower's `<g>` and it
bubbles up.

Phones have no R key, so touch gets a two-finger twist: hold a flower and turn
a second finger around it. The `<svg>` records every pointer in the capture
phase (`pointersRef`). A primary pointer clears the record first, because iOS
can swallow a release when a system gesture cuts in. A second finger landing
on another flower does not start a new drag. The twist is incremental (the
change in the angle between the two fingers since the last move), and it
restarts whenever the pair of pointers changes, so a bad first sample cannot
make the flower jump.

### The flower art is detailed, and shares one toolkit

All twelve flowers are drawn to the standard the tulip set (it is her
favourite, and was done first). They share a kit in `flowerGeometry.ts` (pure)
and `flowerKit.tsx` (components):

- **`RadialFill`** shades a whole ring of petals with one gradient. The trap:
  a `userSpaceOnUse` gradient is resolved in the coordinate system of the shape
  using it, and every ring petal is drawn in its own rotated frame with its
  base at the origin. So the heart is at `(0, offset)`, not `(50, 50)`.
  Centring on `(50, 50)` silently flattens every petal to the last stop.
- **`PetalRing`** takes `shadow` (an offset dark copy, so each ring shades the
  one beneath), `detail` (a midrib, vein or lit rim drawn on every petal), and
  `jitter` + `seed` (deterministic per-petal wobble in angle and size; a little
  of it is most of what stops rings looking stamped).
- **`Lighting`** adds a soft top-left glow. It has deliberately no matching
  shade: on open flowers (lily, orchid) a shade smudges the background
  between petals.
- **`useArtId()`** gives per-instance gradient and clip ids. Every flower
  calls it, so render flower art as a component (`<Art />` or
  `createElement(art, ...)`), never as a plain function. Two separate
  `renderToStaticMarkup` calls produce colliding ids, so put a multi-flower
  preview in one render tree.

Mono mode drops every gradient, shadow and highlight in every flower.

The detail has a cost: a flower is 40 to 210 SVG elements. `FlowerWall` keeps
its grid coarse (`CELL`) for that reason; on a 1280x800 screen the wall is about
16k DOM nodes and roughly 340 ms of main-thread work on load, versus 28k and
530 ms at the old pitch.

### Repeats are varied, from array position

`variantsFor(flowers)` in `lib/arrange.ts` numbers each flower among its own
kind (first rose 0, second rose 1, and so on), and `BouquetCanvas` passes that
as the `variant` prop. Variant 0 is the canonical drawing, which the picker
shows; higher variants go through `variationFor()` to shift tone, ring phase,
openness, petal count and the jitter seed. It depends only on order and type,
never on position, so dragging a flower does not change how it is drawn, and
the builder and home page always agree.

### Greenery is filler behind the blooms

`Greenery` is computed from the flowers. It places sprigs behind each bloom and
in the gap between close neighbours, angled away from the binding point, and
masks the whole layer to the bouquet's shape: a soft-edged circle per bloom
(`OVERHANG` of its box radius, solid to `MASK_SOLID`) plus a bridge between
neighbours. It shows in the gaps and fades out just past the outline. It is
drawn after the stems and before the blooms. Do not go back to a hard
`clipPath`: it slices leaves along visible arcs.

### Phones and iOS

The site is meant to behave the same on a phone as on a computer. Things that
exist for that reason:

- `HomeMenu` is offset by `env(safe-area-inset-*)`. `index.html` uses
  `viewport-fit=cover`, so without the offset the button sits under the
  iPhone home indicator.
- `html` sets `touch-action: manipulation` (no double-tap-zoom delay) and
  `-webkit-tap-highlight-color: transparent`.
- The arrange canvas sets `touch-action: none`, so drags and twists are not
  stolen by page scroll or pinch zoom. Scroll the page from outside the canvas.
- Every text input is at least 16px, or iOS zooms the page on focus. Keep it
  that way.
- The code field uses `autoFocus`, not a focus effect: it mounts after the
  menu's exit animation, so an effect runs before it exists. iOS still opens
  the keyboard only on a real tap.
- Tailwind v4 needs Safari 16.4 or newer (iOS 16.4, March 2023).

These were checked by emulating an iPhone (390x844 at 3x, touch input, iOS
user agent, 1x/4x/6x CPU throttling) over the DevTools protocol, not on a
physical device.

### The create code is checked twice, and only the second check matters

`HomeMenu` posts the typed code to `POST /api/unlock` (204 or 403). On success
`lib/unlock.ts` keeps it in `sessionStorage` and the browser goes to `/create`.
That only gates the UI. `POST /api/bouquets` requires the code again in the
`X-Create-Code` header (compared with `secrets.compare_digest`), and that check
is what stops anyone replacing the home bouquet from devtools. The code is
`settings.create_code`, env `PETALPOST_CREATE_CODE`, default `520`. Both
endpoints are rate limited. A 403 on create makes `StepFinish` forget the
stored code and send the user back to re-enter it; the draft survives.

### "The home bouquet" is just the newest row

There is no home pointer or settings table. `GET /api/home` returns the
`Bouquet` with the latest `created_at`, or `null`. Older bouquets stay in the
database and remain readable by id via `GET /api/bouquets/{id}`.

### One canvas, every surface

`frontend/src/components/BouquetCanvas.tsx` renders a square `0 0 100 100` SVG
and is used by the arrange, wrap and finish steps and the home page. That
single component is what guarantees the bouquet that gets arranged is the
bouquet the home page shows. Flower positions are `x`/`y` in that 0-100 space;
blooms paint sorted by `y`, so lower flowers overlap higher ones.

### The schema lives in three places and must stay in step

| File | Holds |
|---|---|
| `backend/app/catalog.py` | the enums and the count limits |
| `backend/app/schemas.py` | Pydantic validation, the authority |
| `frontend/src/types/bouquet.ts` | the TypeScript mirror, incl. the snake_case wire types |

Adding a flower, wrap or greenery style means touching all three. `lib/api.ts`
is the only module allowed to know the API speaks snake_case.

### The builder is deliberately bare

The builder offers plain colour bouquets only. Letter bouquets, line-art
(`mono`) and reveal dates were removed from the UI, and `parseDraft` in
`lib/storage.ts` forces `mode: 'bouquet'`, `mono: false` and `revealAt: null`
so an older draft cannot bring them back. The reducer, `lib/letters.ts`,
`BouquetCanvas` and the backend schema still support all three, which is why
older stored bouquets keep rendering.

Copy is kept to a minimum on purpose: numbered step dots with no labels, step
titles with no "Step N." prefix, the counter reads just `0 / 6-10`, and there
are no helper sentences or option descriptions. The only text under a flower
card comes from `CARD_NOTES` in `StepFlowers.tsx` (tulip and daisy). The
`meaning` and wrap `description` fields still exist in the catalogs but are not
rendered. Do not add explanatory copy back without being asked.

### Scheduled bouquets are enforced by the server

The builder no longer sets reveal dates, but the server still honours them. A
bouquet with a future `reveal_at` comes back from `/api/home` (and
`/api/bouquets/{id}`) as `BouquetLocked`: no flowers, no message. The home page
draws it wrapped with a `Countdown`, which reloads the page at zero. There is
nothing to find in devtools.

### Light only, colour comes from the flowers

There is no dark mode and no theme provider. The page is white; the chrome is
neutral greys with a near-black accent, defined once as `--pp-*` variables in
`src/index.css`. `lib/theme.ts` is now just `useArtColors()`, returning the
constant `PAPER_LIGHT` / `INK_LIGHT`.

## Invariants that are easy to break

**Mono flowers fill with an opaque paper colour, never `fill="none"`.** With
`none`, every petal ring shows through every other one and a layered flower
renders as a spirograph. The inner rings are supposed to occlude the outer ones.

**`paper` and `ink` are props, not CSS variables.** The art has to stay a
self-contained SVG (the art-sheet scripts render it outside any page), and a
`var(--color-surface)` resolves to nothing there. This is why `FlowerArtProps`
carries `paper` and `BouquetCanvas` carries `ink`.

**Arrangement must stay deterministic.** `lib/random.ts` is seeded; `newSeed()`
is the only sanctioned `Math.random` in the art path. Same stems plus same seed
must always give the same bouquet, or undo, draft restore and the saved bouquet
stop agreeing with each other.

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
`WrapPaper.tsx`. The rule only tolerates primitive constants alongside
components, so functions and object constants have to live in the
non-component file.

**The finish step posts exactly once**, guarded by a ref against StrictMode's
double effect. Removing the guard saves two bouquets per visit. A restored
draft never lands on that step, for the same reason.

**Restart uvicorn after the first `npm run build`.** `app/main.py` registers the
static routes inside `if DIST.is_dir():`, evaluated at import. A server started
before `dist` existed will 503 on `/` until restarted.

**ESLint's typed configs are scoped to `**/*.{ts,tsx}`** because
`eslint.config.js` is plain JS and belongs to no tsconfig; unscoped, the
type-aware rules fail to load for it and the whole lint run dies.

## Tests

Backend covers the create code (unlock, create without or with a wrong code,
the code coming from settings, unlock rate limiting), the home endpoint (empty,
newest wins, sealed), create/fetch/404, every validation rule, sanitisation,
letter mode, scheduled reveals and rate limiting.

Frontend covers the builder reducer and flower-count validation, the
arrangement algorithm, letter glyph layout, undo/redo, and a render pass over
both routes via the real router (`render.test.tsx`), including the code gate
on `/create` and the no-branding check.

Testing notes: `conftest.py` disables the rate limiter by default and the limit
strings are read through callables so a test can tighten them at runtime; the
`client` fixture sends the correct `X-Create-Code` by default, so tests about
the code override or delete that header; and there is no Testing Library, just
a dozen-line hook harness in `src/__tests__/testUtils.tsx`.
