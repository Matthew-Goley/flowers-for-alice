/**
 * Shared components for the twelve flowers.
 *
 * Each flower returns a `<g>`, not an `<svg>`: the same art has to drop into a
 * picker tile, a garden card and the middle of a bouquet canvas. Wrap it in
 * `<FlowerGlyph>` when you need a standalone image.
 *
 * The maths and the colour resolution live next door in `flowerGeometry.ts`.
 * This file exports components only, which is what Fast Refresh needs to
 * hot-reload the artwork without reloading the page.
 */

import type { ReactElement, ReactNode } from 'react';
import { CENTER, PAPER_LIGHT } from './flowerGeometry';

export interface PetalRingProps {
  /** How many petals in this ring. */
  count: number;
  /** Petal outline, usually from one of the `*PetalPath` helpers. */
  d: string;
  /** Degrees added to every petal in the ring, to interleave rings. */
  phase?: number;
  /** Push the petal base out from the heart of the flower. */
  offset?: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
}

function place(angle: number, offset: number): string {
  return offset
    ? `translate(${CENTER} ${CENTER}) rotate(${angle}) translate(0 ${-offset})`
    : `translate(${CENTER} ${CENTER}) rotate(${angle})`;
}

/** A ring of evenly spaced petals. */
export function PetalRing({
  count,
  d,
  phase = 0,
  offset = 0,
  fill,
  stroke,
  strokeWidth = 1.1,
  opacity,
}: PetalRingProps): ReactElement {
  const step = 360 / count;
  return (
    <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity}>
      {Array.from({ length: count }, (_, i) => (
        <path key={i} d={d} transform={place(phase + step * i, offset)} />
      ))}
    </g>
  );
}

export interface PetalFanProps extends Omit<PetalRingProps, 'count' | 'phase'> {
  /** Exact bearings in degrees, for flowers that are not radially symmetric. */
  angles: readonly number[];
}

/** Petals at hand-picked angles, for the tulip, orchid and lily. */
export function PetalFan({
  angles,
  d,
  offset = 0,
  fill,
  stroke,
  strokeWidth = 1.1,
  opacity,
}: PetalFanProps): ReactElement {
  return (
    <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity}>
      {angles.map((angle, i) => (
        <path key={i} d={d} transform={place(angle, offset)} />
      ))}
    </g>
  );
}

export interface SeedCenterProps {
  radius: number;
  fill: string;
  stroke: string;
  /** Speckles scattered over the disc, like a sunflower head. */
  seeds?: number;
  seedFill?: string;
  mono?: boolean;
  /** Occluding fill used in mono mode. */
  paper?: string;
}

export function SeedCenter({
  radius,
  fill,
  stroke,
  seeds = 0,
  seedFill,
  mono = false,
  paper = PAPER_LIGHT,
}: SeedCenterProps): ReactElement {
  // A fixed spiral rather than Math.random: the art has to be identical on
  // every render, and identical between the client and a screenshot.
  const dots = Array.from({ length: seeds }, (_, i) => {
    const angle = i * 137.5 * (Math.PI / 180);
    const r = radius * 0.72 * Math.sqrt((i + 0.5) / seeds);
    return { cx: CENTER + r * Math.cos(angle), cy: CENTER + r * Math.sin(angle) };
  });

  return (
    <g>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        fill={mono ? paper : fill}
        stroke={stroke}
        strokeWidth={1.1}
      />
      {mono
        ? // One concentric ring stands in for the seed texture in line art.
          seeds > 0 && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={radius * 0.58}
              fill="none"
              stroke={stroke}
              strokeWidth={1.1}
            />
          )
        : dots.map((dot, i) => (
            <circle
              key={i}
              cx={dot.cx}
              cy={dot.cy}
              r={radius * 0.1}
              fill={seedFill ?? stroke}
            />
          ))}
    </g>
  );
}

export interface FlowerGlyphProps {
  children: ReactNode;
  className?: string;
  /** Accessible name. Omit for decorative art inside a labelled container. */
  title?: string;
  size?: number | string;
}

/** Wraps flower art in a standalone, square SVG. */
export function FlowerGlyph({
  children,
  className,
  title,
  size,
}: FlowerGlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {children}
    </svg>
  );
}
