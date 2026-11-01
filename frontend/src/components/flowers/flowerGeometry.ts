/**
 * Petal geometry and colour resolution.
 *
 * The pure half of the flower kit: path builders, transforms and the palette
 * function. Kept apart from the components in `flowerKit.tsx` so that file
 * exports nothing but components, which is what React Fast Refresh needs to
 * hot-reload the artwork without a full page reload.
 */

import { createContext, useId, type ReactElement } from 'react';
import { darken, lighten, petalEdge } from '../../lib/color';
import { between, makeRng, type Rng } from '../../lib/random';

/** Every bloom is authored in a 100x100 box with its heart at (50, 50). */
export const CENTER = 50;

export interface FlowerArtProps {
  /** Base petal colour as hex. Ignored in mono mode. */
  color: string;
  /** Line-art rendering: ink outlines over an opaque paper fill. */
  mono: boolean;
  /**
   * The colour behind the art, used as the occluding fill in mono mode.
   *
   * Passed explicitly as a hex value rather than read from a CSS variable:
   * the art has to stay a self-contained SVG (the art-sheet scripts render it
   * outside any page), and a `var()` resolves to nothing there.
   */
  paper?: string;
  /**
   * Which instance of this flower in the bouquet: 0 for the first, 1 for the
   * second, and so on. 0 is the canonical drawing (the picker shows it);
   * higher values vary tone, petal count and ring phase so a bouquet with
   * five roses has five different roses. Must be deterministic: the builder
   * and the home page derive it the same way, from position in the array.
   */
  variant?: number;
}

export type FlowerArt = (props: FlowerArtProps) => ReactElement;

/** Ink used for every mono line, and for stems and detail everywhere. */
export const MONO_INK = 'currentColor';

/**
 * Default paper colour: the page itself, which is plain white.
 *
 * Mono petals are filled with the colour behind them, not with `none`. It
 * matters: with `fill="none"` every ring shows through every other ring and a
 * layered flower turns into a spirograph. An opaque fill lets inner petals
 * occlude outer ones, which is what makes the line art read as a flower.
 */
export const PAPER_LIGHT = '#ffffff';
export const PAPER_DARK = '#2f2429';

/** Line colour for mono art, passed down for the same reason as the paper. */
export const INK_LIGHT = '#262626';
export const INK_DARK = '#f6ebe4';

/**
 * How much finish to draw. `lite` drops the purely decorative layers (ring
 * drop shadows, per-petal veins and rims, the lighting glow) and roughly
 * halves a flower's element count while keeping its shape and colour. The
 * flower wall uses it on phones and tablets, where it draws dozens of
 * flowers at once; a bouquet always draws in full.
 */
export type ArtDetail = 'full' | 'lite';
export const ArtDetailContext = createContext<ArtDetail>('full');

/**
 * A per-instance id prefix for gradients and clip paths. A bouquet holds many
 * copies of the same flower, so ids must never be shared between them.
 */
export function useArtId(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '');
}

/** How one instance of a flower differs from the canonical drawing. */
export interface Variation {
  /** Lighten (positive) or darken (negative) the chosen colour, at most 0.09. */
  tone: number;
  /** Degrees to turn inner rings against the outer ones. */
  phase: number;
  /** Multiplier for outer petal length: how far open the bloom is. */
  open: number;
  /** -1, 0 or 1: one fewer, the same, or one more petal in a ring. */
  extra: number;
  /** Further deterministic randomness for flower-specific choices. */
  rng: Rng;
}

const CANONICAL: Variation = { tone: 0, phase: 0, open: 1, extra: 0, rng: () => 0.5 };

export function variationFor(variant = 0): Variation {
  if (!variant) return CANONICAL;
  const rng = makeRng(variant * 7919 + 104729);
  return {
    tone: between(rng, -0.09, 0.09),
    phase: between(rng, 8, 52),
    open: between(rng, 0.93, 1.05),
    extra: Math.min(1, Math.floor(between(rng, -1, 2))),
    rng,
  };
}

/** Shift a colour lighter (positive amount) or darker (negative). */
export function toned(color: string, amount: number): string {
  if (amount === 0) return color;
  return amount > 0 ? lighten(color, amount) : darken(color, -amount);
}

/**
 * A ruffled petal: teardrop body with a scalloped tip, for peonies.
 * `waves` bumps run across the tip; `depth` is how deep they cut.
 */
export function ruffledPetalPath(
  length: number,
  width: number,
  waves = 3,
  depth = 2.4,
): string {
  const w = width;
  const reach = w * 0.78;
  const arc = (x: number) => -length * 0.84 - length * 0.16 * (1 - (x / reach) ** 2);
  const parts = [
    `M0 0 C${-w * 0.9} ${-length * 0.18} ${-w} ${-length * 0.62} ${-reach} ${-length * 0.84}`,
  ];
  for (let i = 0; i < waves; i += 1) {
    const x0 = -reach + (2 * reach * i) / waves;
    const x1 = -reach + (2 * reach * (i + 1)) / waves;
    const mx = (x0 + x1) / 2;
    const dip = i < waves - 1 ? depth * 0.35 : 0;
    parts.push(
      `Q${mx.toFixed(2)} ${(arc(mx) - depth).toFixed(2)} ${x1.toFixed(2)} ${(arc(x1) + dip).toFixed(2)}`,
    );
  }
  parts.push(`C${w} ${-length * 0.62} ${w * 0.9} ${-length * 0.18} 0 0 Z`);
  return parts.join(' ');
}

/** A frilled petal with a sawtooth tip, the carnation's signature edge. */
export function serratedPetalPath(length: number, width: number, teeth = 6): string {
  const w = width;
  const x = (t: number) => -w + 2 * w * t;
  const y = (t: number) => -length * 0.82 - length * 0.18 * Math.sin(Math.PI * t);
  const parts = [
    `M0 0 C${-w * 0.8} ${-length * 0.2} ${-w * 1.05} ${-length * 0.6} ${-w} ${-length * 0.82}`,
  ];
  for (let i = 0; i < teeth; i += 1) {
    const t1 = (i + 1) / teeth;
    const tm = (i + 0.5) / teeth;
    parts.push(
      `L${x(tm).toFixed(2)} ${(y(tm) - length * 0.045).toFixed(2)} L${x(t1).toFixed(2)} ${y(t1).toFixed(2)}`,
    );
  }
  parts.push(`C${w * 1.05} ${-length * 0.6} ${w * 0.8} ${-length * 0.2} 0 0 Z`);
  return parts.join(' ');
}

/**
 * A teardrop petal pointing straight up from the origin.
 *
 * `pinch` pulls the control points in near the base (a narrow waist) and
 * `bulge` pushes them out near the tip (a blunt, rounded end). Between them
 * they cover everything from a daisy ray to a peony ruffle.
 */
export function petalPath(length: number, width: number, pinch = 0.22, bulge = 0.74): string {
  const p = (length * pinch).toFixed(2);
  const b = (length * bulge).toFixed(2);
  const w = width.toFixed(2);
  const tip = length.toFixed(2);
  return `M0 0 C-${w} -${p} -${w} -${b} 0 -${tip} C${w} -${b} ${w} -${p} 0 0 Z`;
}

/** A petal with a pointed tip, for lilies, tulips and sunflower rays. */
export function pointedPetalPath(length: number, width: number, waist = 0.5): string {
  const w = width.toFixed(2);
  const mid = (length * waist).toFixed(2);
  const tip = length.toFixed(2);
  const shoulder = (width * 0.35).toFixed(2);
  return `M0 0 C-${w} -${mid} -${shoulder} -${tip} 0 -${tip} C${shoulder} -${tip} ${w} -${mid} 0 0 Z`;
}

/** A rounded, slightly cupped petal, used by roses and ranunculus. */
export function cuppedPetalPath(length: number, width: number): string {
  const w = width.toFixed(2);
  const tip = length.toFixed(2);
  const shoulder = (length * 0.55).toFixed(2);
  const base = (length * 0.18).toFixed(2);
  const lip = (width * 0.42).toFixed(2);
  const curl = (width * 0.12).toFixed(2);
  const over = (length * 1.08).toFixed(2);
  return (
    `M0 0 C-${w} -${base} -${w} -${shoulder} -${lip} -${tip} ` +
    `C-${curl} -${over} ${curl} -${over} ${lip} -${tip} ` +
    `C${w} -${shoulder} ${w} -${base} 0 0 Z`
  );
}

/**
 * The rolled lip along the top of a `cuppedPetalPath` petal, as an open path.
 * Stroked pale, it reads as light catching the rim of the cup.
 */
export function cupLipPath(length: number, width: number): string {
  const lip = (width * 0.38).toFixed(2);
  const curl = (width * 0.12).toFixed(2);
  const y = (length * 0.985).toFixed(2);
  const over = (length * 1.055).toFixed(2);
  return `M-${lip} -${y} C-${curl} -${over} ${curl} -${over} ${lip} -${y}`;
}

/** Place a petal at `angle` degrees, optionally pushed out from the heart. */
export function transformFor(angle: number, offset = 0): string {
  return offset
    ? `translate(${CENTER} ${CENTER}) rotate(${angle}) translate(0 ${-offset})`
    : `translate(${CENTER} ${CENTER}) rotate(${angle})`;
}

export interface FlowerColors {
  paper: string;
  petal: string;
  petalDeep: string;
  petalLight: string;
  edge: string;
  heart: string;
  heartEdge: string;
}

/**
 * Resolve the colours a flower draws with. Mono mode collapses the fills to
 * the paper colour and every line to the inherited ink, so the art reads as a
 * line drawing rather than a stack of transparent rings.
 */
export function flowerPalette(
  color: string,
  mono: boolean,
  paper: string = PAPER_LIGHT,
): FlowerColors {
  if (mono) {
    return {
      paper,
      petal: paper,
      petalDeep: paper,
      petalLight: paper,
      edge: MONO_INK,
      heart: paper,
      heartEdge: MONO_INK,
    };
  }
  return {
    paper,
    petal: color,
    petalDeep: darken(color, 0.14),
    petalLight: lighten(color, 0.22),
    edge: petalEdge(color),
    heart: lighten(color, 0.55),
    heartEdge: petalEdge(color),
  };
}
