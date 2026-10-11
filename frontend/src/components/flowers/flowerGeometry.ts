/**
 * Petal geometry and colour resolution.
 *
 * The pure half of the flower kit: path builders, transforms and the palette
 * function. Kept apart from the components in `flowerKit.tsx` so that file
 * exports nothing but components, which is what React Fast Refresh needs to
 * hot-reload the artwork without a full page reload.
 */

import { darken, lighten, petalEdge } from '../../lib/color';
import type { ReactElement } from 'react';

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
   * the same markup is serialised into a standalone SVG for the PNG download,
   * and a standalone SVG does not inherit custom properties from the document
   * that produced it. A `var()` here renders black once exported.
   */
  paper?: string;
}

export type FlowerArt = (props: FlowerArtProps) => ReactElement;

/** Ink used for every mono line, and for stems and detail everywhere. */
export const MONO_INK = 'currentColor';

/**
 * Default paper colour: the light-theme card surface.
 *
 * Mono petals are filled with the colour behind them, not with `none`. It
 * matters: with `fill="none"` every ring shows through every other ring and a
 * layered flower turns into a spirograph. An opaque fill lets inner petals
 * occlude outer ones, which is what makes the line art read as a flower.
 */
export const PAPER_LIGHT = '#ffffff';
export const PAPER_DARK = '#2f2429';

/** Line colour for mono art, passed down for the same reason as the paper. */
export const INK_LIGHT = '#3f3038';
export const INK_DARK = '#f6ebe4';

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
