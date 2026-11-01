/**
 * Where the photos behind the home page bouquet go.
 *
 * The screen is cut into a grid, shaped to the screen so cells stay roughly
 * square on a phone and on a monitor. Cells whose middle falls inside an oval
 * around the bouquet are left empty, and the grid grows until there is one
 * free cell per photo. Each photo then gets the same area, whatever its
 * shape, so a full-size camera photo and a small screenshot read as the same
 * size. Pure and seeded: the same screen always gives the same layout.
 */

import { between, makeRng, shuffled } from './random';
import type { Photo } from './photos';

export interface PlacedPhoto {
  src: string;
  /** Centre of the card, in px from the top-left of the screen. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/** Share of a cell's area each photo covers. */
const FILL = 0.5;
/** How far past its cell a very wide or tall photo may reach. */
const MAX_WIDTH = 1;
const MAX_HEIGHT = 1.1;
/** How far a photo may sit from the middle of its cell, as a share of it. */
const JITTER = 0.14;
const MAX_TILT = 8;
const SEED = 1407;
/** The bouquet's oval: its width in px at most, and its height as a share of that. */
const BOUQUET_WIDTH = 560;
const BOUQUET_TALL = 1.3;

export function layPhotos(
  photos: readonly Photo[],
  width: number,
  height: number,
): PlacedPhoto[] {
  const count = photos.length;
  if (count === 0 || width <= 0 || height <= 0) return [];

  // The oval the photos keep out of, centred on the screen like the bouquet.
  const rx = Math.min(width, BOUQUET_WIDTH) / 2;
  const ry = Math.min(height, rx * 2 * BOUQUET_TALL) / 2;

  let cellW = width;
  let cellH = height;
  let free: { col: number; row: number; distance: number }[] = [];
  // Grow the grid until enough cells sit outside the oval. Capped, so a
  // screen smaller than the oval still gets a layout, just a crowded one.
  for (let n = count; n <= count * 8; n += 1) {
    const cols = Math.max(1, Math.round(Math.sqrt((n * width) / height)));
    const rows = Math.ceil(n / cols);
    cellW = width / cols;
    cellH = height / rows;
    free = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const dx = ((col + 0.5) * cellW - width / 2) / rx;
        const dy = ((row + 0.5) * cellH - height / 2) / ry;
        const distance = Math.hypot(dx, dy);
        if (distance >= 1) free.push({ col, row, distance });
      }
    }
    if (free.length >= count) break;
  }
  // Spare cells come off the ones hugging the oval.
  free.sort((a, b) => b.distance - a.distance);

  const rng = makeRng(SEED);
  const order = shuffled(photos, rng);
  const area = FILL * cellW * cellH;

  return free.slice(0, count).map((cell, i) => {
    const photo = order[i];
    const aspect = photo.width / photo.height;
    let w = Math.sqrt(area * aspect);
    let h = w / aspect;
    const shrink = Math.min(1, (MAX_WIDTH * cellW) / w, (MAX_HEIGHT * cellH) / h);
    w *= shrink;
    h *= shrink;
    return {
      src: photo.src,
      x: (cell.col + 0.5 + between(rng, -JITTER, JITTER)) * cellW,
      y: (cell.row + 0.5 + between(rng, -JITTER, JITTER)) * cellH,
      width: Math.round(w),
      height: Math.round(h),
      rotation: between(rng, -MAX_TILT, MAX_TILT),
    };
  });
}
