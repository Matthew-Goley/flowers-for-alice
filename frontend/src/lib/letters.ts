/**
 * Letter bouquets: spell a word out of small blooms.
 *
 * Each glyph is a handful of polylines on a 6-wide by 10-tall grid, drawn as
 * single strokes the way you would write the letter with a pen. Flowers are
 * then dotted along those strokes at an even spacing, so the letter reads as a
 * line of blossom rather than a filled block.
 *
 * Glyph data is deliberately plain arrays: it is easier to nudge a vertex than
 * to argue with a font.
 */

import type { FlowerPlacement, FlowerType } from '../types/bouquet';
import { MAX_LETTER_FLOWERS } from '../types/bouquet';
import { between, makeRng, type Rng } from './random';

type Point = readonly [number, number];
type Stroke = readonly Point[];
type Glyph = readonly Stroke[];

export const GLYPH_WIDTH = 6;
export const GLYPH_HEIGHT = 10;

/** Letters are drawn on a 6 x 10 grid, origin top-left, y pointing down. */
const GLYPHS: Record<string, Glyph> = {
  A: [
    [
      [0, 10],
      [3, 0],
      [6, 10],
    ],
    [
      [1.1, 6.6],
      [4.9, 6.6],
    ],
  ],
  B: [
    [
      [0, 0],
      [0, 10],
    ],
    [
      [0, 0],
      [3.9, 0],
      [5.2, 1.3],
      [5.2, 3.5],
      [3.9, 4.9],
      [0, 4.9],
    ],
    [
      [0, 4.9],
      [4.3, 4.9],
      [5.6, 6.4],
      [5.6, 8.6],
      [4.3, 10],
      [0, 10],
    ],
  ],
  C: [
    [
      [5.9, 1.8],
      [4.3, 0.2],
      [2.1, 0],
      [0.5, 2],
      [0, 5],
      [0.5, 8],
      [2.1, 10],
      [4.3, 9.8],
      [5.9, 8.2],
    ],
  ],
  D: [
    [
      [0, 0],
      [0, 10],
    ],
    [
      [0, 0],
      [3.3, 0],
      [5.4, 2],
      [6, 5],
      [5.4, 8],
      [3.3, 10],
      [0, 10],
    ],
  ],
  E: [
    [
      [5.8, 0],
      [0, 0],
      [0, 10],
      [5.8, 10],
    ],
    [
      [0, 4.9],
      [4.6, 4.9],
    ],
  ],
  F: [
    [
      [5.8, 0],
      [0, 0],
      [0, 10],
    ],
    [
      [0, 4.9],
      [4.4, 4.9],
    ],
  ],
  G: [
    [
      [5.9, 1.8],
      [4.3, 0.2],
      [2.1, 0],
      [0.5, 2],
      [0, 5],
      [0.5, 8],
      [2.1, 10],
      [4.4, 9.9],
      [6, 8.3],
      [6, 5.5],
      [3.4, 5.5],
    ],
  ],
  H: [
    [
      [0, 0],
      [0, 10],
    ],
    [
      [6, 0],
      [6, 10],
    ],
    [
      [0, 4.9],
      [6, 4.9],
    ],
  ],
  I: [
    [
      [1.1, 0],
      [4.9, 0],
    ],
    [
      [3, 0],
      [3, 10],
    ],
    [
      [1.1, 10],
      [4.9, 10],
    ],
  ],
  J: [
    [
      [5, 0],
      [5, 7.4],
      [4.1, 9.5],
      [2.1, 10],
      [0.4, 8.7],
    ],
  ],
  K: [
    [
      [0, 0],
      [0, 10],
    ],
    [
      [5.5, 0],
      [0.3, 5.4],
    ],
    [
      [2.1, 3.6],
      [6, 10],
    ],
  ],
  L: [
    [
      [0, 0],
      [0, 10],
      [5.5, 10],
    ],
  ],
  M: [
    [
      [0, 10],
      [0, 0],
      [3, 5.6],
      [6, 0],
      [6, 10],
    ],
  ],
  N: [
    [
      [0, 10],
      [0, 0],
      [6, 10],
      [6, 0],
    ],
  ],
  O: [
    [
      [3, 0],
      [5.2, 1.5],
      [6, 5],
      [5.2, 8.5],
      [3, 10],
      [0.8, 8.5],
      [0, 5],
      [0.8, 1.5],
      [3, 0],
    ],
  ],
  P: [
    [
      [0, 10],
      [0, 0],
      [4.1, 0],
      [5.5, 1.6],
      [5.5, 4],
      [4.1, 5.6],
      [0, 5.6],
    ],
  ],
  Q: [
    [
      [3, 0],
      [5.2, 1.5],
      [6, 5],
      [5.2, 8.5],
      [3, 10],
      [0.8, 8.5],
      [0, 5],
      [0.8, 1.5],
      [3, 0],
    ],
    [
      [3.6, 7],
      [6.2, 10.4],
    ],
  ],
  R: [
    [
      [0, 10],
      [0, 0],
      [4.1, 0],
      [5.5, 1.6],
      [5.5, 4],
      [4.1, 5.6],
      [0, 5.6],
    ],
    [
      [2.6, 5.6],
      [6, 10],
    ],
  ],
  S: [
    [
      [5.7, 1.5],
      [4, 0.1],
      [1.8, 0.1],
      [0.3, 1.7],
      [0.7, 3.6],
      [2.5, 4.5],
      [3.8, 5.1],
      [5.4, 6.2],
      [5.7, 8.2],
      [4.3, 9.8],
      [2, 10],
      [0.2, 8.5],
    ],
  ],
  T: [
    [
      [0, 0],
      [6, 0],
    ],
    [
      [3, 0],
      [3, 10],
    ],
  ],
  U: [
    [
      [0, 0],
      [0, 6.9],
      [1.2, 9.4],
      [3, 10],
      [4.8, 9.4],
      [6, 6.9],
      [6, 0],
    ],
  ],
  V: [
    [
      [0, 0],
      [3, 10],
      [6, 0],
    ],
  ],
  W: [
    [
      [0, 0],
      [1.4, 10],
      [3, 3.8],
      [4.6, 10],
      [6, 0],
    ],
  ],
  X: [
    [
      [0, 0],
      [6, 10],
    ],
    [
      [6, 0],
      [0, 10],
    ],
  ],
  Y: [
    [
      [0, 0],
      [3, 5.2],
      [6, 0],
    ],
    [
      [3, 5.2],
      [3, 10],
    ],
  ],
  Z: [
    [
      [0, 0],
      [6, 0],
      [0, 10],
      [6, 10],
    ],
  ],
};

/** Horizontal gap between letters, and the width a space advances. */
const LETTER_GAP = 2.2;
const SPACE_WIDTH = 3.4;
const LINE_GAP = 4.2;

/**
 * How many characters fit on one line before the text wraps.
 *
 * Eight is chosen so that BIRTHDAY, THANK YOU and CONGRATS all survive intact;
 * at seven, "HAPPY BIRTHDAY" breaks as BIRTHDA / Y, which looks like a bug.
 */
export const MAX_CHARS_PER_LINE = 8;

export function isSupportedLetterText(text: string): boolean {
  return /^[A-Za-z ]*$/.test(text);
}

/**
 * Break text into lines of at most `MAX_CHARS_PER_LINE`, preferring to break
 * at spaces. A single word longer than the limit is split rather than
 * overflowing, because the canvas is square and legibility wins.
 */
export function layoutLines(text: string, maxChars = MAX_CHARS_PER_LINE): string[] {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function strokeLength(stroke: Stroke): number {
  let total = 0;
  for (let i = 1; i < stroke.length; i += 1) {
    const a = stroke[i - 1];
    const b = stroke[i];
    if (!a || !b) continue;
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

/** Walk a polyline and return points spaced `spacing` grid units apart. */
function samplePolyline(stroke: Stroke, spacing: number): Point[] {
  const total = strokeLength(stroke);
  if (total === 0) {
    const only = stroke[0];
    return only ? [only] : [];
  }

  const steps = Math.max(1, Math.round(total / spacing));
  const points: Point[] = [];

  for (let s = 0; s <= steps; s += 1) {
    const target = (total * s) / steps;
    let walked = 0;

    for (let i = 1; i < stroke.length; i += 1) {
      const a = stroke[i - 1];
      const b = stroke[i];
      if (!a || !b) continue;
      const segment = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (segment === 0) continue;

      if (walked + segment >= target - 1e-9) {
        const t = (target - walked) / segment;
        points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        break;
      }
      walked += segment;
    }
  }
  return points;
}

/** Grid-space sample points for one line of text, plus the line's width. */
function sampleLine(line: string, spacing: number): { points: Point[]; width: number } {
  const points: Point[] = [];
  let cursor = 0;

  for (const char of line) {
    if (char === ' ') {
      cursor += SPACE_WIDTH + LETTER_GAP;
      continue;
    }
    const glyph = GLYPHS[char];
    if (!glyph) {
      cursor += SPACE_WIDTH + LETTER_GAP;
      continue;
    }
    for (const stroke of glyph) {
      for (const [x, y] of samplePolyline(stroke, spacing)) {
        points.push([cursor + x, y]);
      }
    }
    cursor += GLYPH_WIDTH + LETTER_GAP;
  }

  return { points, width: Math.max(0, cursor - LETTER_GAP) };
}

export interface LetterBouquetOptions {
  text: string;
  /** Petal colours, cycled through the blooms. */
  palette: readonly string[];
  /** Flower types, cycled through the blooms. */
  types: readonly FlowerType[];
  seed: number;
  /** Lower values pack more, smaller flowers into each stroke. */
  spacing?: number;
}

/**
 * Turn a word into a field of small flowers tracing its letters.
 *
 * Spacing widens automatically if the word would need more blooms than the
 * API accepts, so a long message degrades to a sparser outline instead of
 * being rejected.
 */
export function buildLetterBouquet({
  text,
  palette,
  types,
  seed,
  spacing = 1.25,
}: LetterBouquetOptions): FlowerPlacement[] {
  const lines = layoutLines(text);
  if (lines.length === 0 || palette.length === 0 || types.length === 0) return [];

  let step = spacing;
  let sampled = lines.map((line) => sampleLine(line, step));
  let total = sampled.reduce((sum, line) => sum + line.points.length, 0);

  // Back off until the bouquet fits inside the API's ceiling.
  let guard = 0;
  while (total > MAX_LETTER_FLOWERS && guard < 12) {
    step *= 1.3;
    sampled = lines.map((line) => sampleLine(line, step));
    total = sampled.reduce((sum, line) => sum + line.points.length, 0);
    guard += 1;
  }

  const widest = Math.max(...sampled.map((line) => line.width), 1);
  const gridHeight = lines.length * GLYPH_HEIGHT + (lines.length - 1) * LINE_GAP;

  // Fit the block of text into the canvas with a margin, preserving aspect.
  const margin = 9;
  const usable = 100 - margin * 2;
  const scale = Math.min(usable / widest, usable / gridHeight);

  const blockHeight = gridHeight * scale;
  const originY = (100 - blockHeight) / 2;

  const rng = makeRng(seed);
  const flowers: FlowerPlacement[] = [];

  sampled.forEach((line, lineIndex) => {
    // Centre each line horizontally in the canvas.
    const originX = (100 - line.width * scale) / 2;
    const lineTop = originY + lineIndex * (GLYPH_HEIGHT + LINE_GAP) * scale;

    for (const [gx, gy] of line.points) {
      flowers.push(
        makeBloom(gx, gy, originX, lineTop, scale, palette, types, flowers.length, rng),
      );
    }
  });

  return flowers;
}

function makeBloom(
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  scale: number,
  palette: readonly string[],
  types: readonly FlowerType[],
  index: number,
  rng: Rng,
): FlowerPlacement {
  const color = palette[index % palette.length] ?? '#e4879f';
  const type = types[index % types.length] ?? 'daisy';

  // A little jitter stops the letters looking like a dot-matrix printout.
  const x = originX + gx * scale + between(rng, -0.7, 0.7);
  const y = originY + gy * scale + between(rng, -0.7, 0.7);

  return {
    type,
    color,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    rotation: Math.round(between(rng, -28, 28)),
    // Blooms scale with the text so a short word gets bigger flowers.
    scale: Math.round(Math.min(0.62, Math.max(0.22, scale * 0.09)) * 1000) / 1000,
  };
}

/** Characters the letter mode knows how to draw. */
export const SUPPORTED_LETTERS = Object.keys(GLYPHS).join('');
