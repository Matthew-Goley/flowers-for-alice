/**
 * Bouquet arrangement.
 *
 * Flowers are laid out along one or two elliptical arcs to make a fan that
 * widens as it rises out of the wrap, the way a hand-tied bouquet actually
 * sits. Back-row blooms are higher, smaller and spaced wider; front-row blooms
 * are lower, larger and overlap the row behind.
 *
 * Everything is driven by a seed, so an arrangement is reproducible: the same
 * stems and the same seed always produce the same bouquet, which is what makes
 * undo/redo, draft restore and the shared link all agree with each other.
 */

import type { FlowerPlacement, FlowerType } from '../types/bouquet';
import { between, makeRng, shuffled, type Rng } from './random';

/** A chosen bloom, before it has a position. */
export interface Stem {
  type: FlowerType;
  color: string;
}

/** The point in the canvas where every stem converges, inside the wrap. */
export const BINDING_POINT = { x: 50, y: 86 } as const;

/** Flowers may be dragged this far outside the 0-100 canvas before clamping. */
const CANVAS_MIN = -6;
const CANVAS_MAX = 106;

interface ArcSpec {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Degrees, measured so that 180 is hard left and 360 is hard right. */
  fromAngle: number;
  toAngle: number;
  scale: number;
}

const BACK_ARC: ArcSpec = {
  cx: 50,
  cy: 50,
  rx: 28,
  ry: 16,
  fromAngle: 196,
  toAngle: 344,
  scale: 0.92,
};

const FRONT_ARC: ArcSpec = {
  cx: 50,
  cy: 60,
  rx: 20,
  ry: 11,
  fromAngle: 206,
  toAngle: 334,
  scale: 1.06,
};

/** A single row, used when there are few enough stems to read as one fan. */
const SINGLE_ARC: ArcSpec = {
  cx: 50,
  cy: 55,
  rx: 25,
  ry: 15,
  fromAngle: 198,
  toAngle: 342,
  scale: 1,
};

export function clampToCanvas(value: number): number {
  return Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, value));
}

function pointOnArc(arc: ArcSpec, t: number): { x: number; y: number } {
  // t runs 0..1 across the arc. A single flower sits in the middle.
  const angle = arc.fromAngle + (arc.toAngle - arc.fromAngle) * t;
  const rad = (angle * Math.PI) / 180;
  return {
    x: arc.cx + arc.rx * Math.cos(rad),
    y: arc.cy + arc.ry * Math.sin(rad),
  };
}

function placeOnArc(stems: readonly Stem[], arc: ArcSpec, rng: Rng): FlowerPlacement[] {
  return stems.map((stem, i) => {
    const t = stems.length === 1 ? 0.5 : i / (stems.length - 1);
    const { x, y } = pointOnArc(arc, t);

    // Blooms toward the middle of the arc sit a touch higher, which rounds the
    // silhouette into a dome instead of a flat line.
    const dome = Math.sin(Math.PI * t) * 2.4;

    return {
      type: stem.type,
      color: stem.color,
      x: round(clampToCanvas(x + between(rng, -1.6, 1.6))),
      y: round(clampToCanvas(y - dome + between(rng, -1.4, 1.4))),
      // Flowers lean away from the centre, as if fanning out of the binding.
      rotation: round((x - arc.cx) * 0.45 + between(rng, -11, 11)),
      scale: round(arc.scale * between(rng, 0.9, 1.08), 3),
    };
  });
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Split stems into a back and a front row.
 *
 * Up to six stems read better as a single fan; beyond that the bouquet needs
 * depth, so the back row takes the extra stem when the count is odd.
 */
export function splitRows(stems: readonly Stem[]): {
  back: readonly Stem[];
  front: readonly Stem[];
} {
  if (stems.length <= 6) return { back: stems, front: [] };
  const backCount = Math.ceil(stems.length / 2);
  return { back: stems.slice(0, backCount), front: stems.slice(backCount) };
}

/**
 * Lay a set of stems out into a bouquet.
 *
 * The stem order is shuffled first so that repeats of the same flower do not
 * end up side by side, then split into rows and placed along the arcs.
 */
export function arrangeBouquet(stems: readonly Stem[], seed: number): FlowerPlacement[] {
  if (stems.length === 0) return [];

  const rng = makeRng(seed);
  const mixed = shuffled(stems, rng);
  const { back, front } = splitRows(mixed);

  if (front.length === 0) {
    return placeOnArc(back, SINGLE_ARC, rng);
  }

  // Back row first: the canvas paints in array order, so later entries sit in
  // front. The same convention is used by the OG painter.
  return [...placeOnArc(back, BACK_ARC, rng), ...placeOnArc(front, FRONT_ARC, rng)];
}

/**
 * Re-arrange an existing bouquet, keeping exactly the same blooms.
 *
 * Used by the Shuffle button: the user keeps their flower choices and gets a
 * new composition.
 */
export function reshuffle(
  flowers: readonly FlowerPlacement[],
  seed: number,
): FlowerPlacement[] {
  const stems: Stem[] = flowers.map((flower) => ({ type: flower.type, color: flower.color }));
  return arrangeBouquet(stems, seed);
}

/**
 * Which instance of its kind each flower is: 0 for the first rose, 1 for the
 * second rose, and so on. The art uses it to vary repeats, so it must come
 * from the stored array alone: the builder and the home page both call this
 * on the same flowers and get the same answer.
 */
export function variantsFor(flowers: readonly FlowerPlacement[]): number[] {
  const seen = new Map<string, number>();
  return flowers.map((flower) => {
    const n = seen.get(flower.type) ?? 0;
    seen.set(flower.type, n + 1);
    return n;
  });
}

/**
 * Normalise an angle to (-180, 180]. The API accepts -360 to 360, and keeping
 * it small means repeated spins can never walk a rotation out of range.
 */
export function normaliseAngle(degrees: number): number {
  const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/** Turn one flower to an absolute angle in degrees. Returns a new array. */
export function rotateFlower(
  flowers: readonly FlowerPlacement[],
  index: number,
  rotation: number,
): FlowerPlacement[] {
  return flowers.map((flower, i) =>
    i === index ? { ...flower, rotation: round(normaliseAngle(rotation)) } : flower,
  );
}

/** Move one flower, clamping it to the canvas. Returns a new array. */
export function moveFlower(
  flowers: readonly FlowerPlacement[],
  index: number,
  x: number,
  y: number,
): FlowerPlacement[] {
  return flowers.map((flower, i) =>
    i === index
      ? { ...flower, x: round(clampToCanvas(x)), y: round(clampToCanvas(y)) }
      : flower,
  );
}

/**
 * Expand a tally of flower types into a flat list of stems.
 *
 * The builder tracks "three roses, two peonies"; the arranger wants a list.
 */
export function stemsFromCounts(
  counts: ReadonlyMap<FlowerType, number>,
  colorOf: (type: FlowerType) => string,
): Stem[] {
  const stems: Stem[] = [];
  for (const [type, count] of counts) {
    for (let i = 0; i < count; i += 1) {
      stems.push({ type, color: colorOf(type) });
    }
  }
  return stems;
}
