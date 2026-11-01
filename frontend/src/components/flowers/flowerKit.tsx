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

import { useContext, type ReactElement, type ReactNode } from 'react';
import { ArtDetailContext, CENTER, PAPER_LIGHT } from './flowerGeometry';

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
  /**
   * Colour of a soft drop shadow cast by this ring onto whatever is beneath
   * it. Omit in mono mode: line art has no shading.
   */
  shadow?: string;
  /** A detail line drawn on every petal (a midrib, a lit rim), in petal space. */
  detail?: string;
  detailStroke?: string;
  detailWidth?: number;
  detailOpacity?: number;
  /**
   * 0 to 1: how far each petal strays from perfect spacing and size. Real
   * flowers are never regular; a little jitter is most of what stops a ring
   * looking stamped. Deterministic, driven by `seed`.
   */
  jitter?: number;
  seed?: number;
}

/** A repeatable pseudo-random number in [0, 1) for petal `i` of ring `seed`. */
function wobble(i: number, seed: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + seed * 78.233 + salt * 37.719) * 43758.5453;
  return x - Math.floor(x);
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
  shadow,
  detail,
  detailStroke,
  detailWidth = 0.6,
  detailOpacity = 0.5,
  jitter = 0,
  seed = 0,
}: PetalRingProps): ReactElement {
  // Lite drawing keeps the petals and drops the decoration around them.
  const lite = useContext(ArtDetailContext) === 'lite';
  const ringShadow = lite ? undefined : shadow;
  const ringDetail = lite ? undefined : detail;
  const step = 360 / count;
  const transforms = Array.from({ length: count }, (_, i) => {
    const angle = phase + step * i + (wobble(i, seed, 1) - 0.5) * step * 0.4 * jitter;
    const sy = 1 + (wobble(i, seed, 2) - 0.5) * 0.26 * jitter;
    const sx = 1 + (wobble(i, seed, 3) - 0.5) * 0.22 * jitter;
    const base = place(angle, offset);
    return jitter ? `${base} scale(${sx.toFixed(3)} ${sy.toFixed(3)})` : base;
  });
  return (
    <g opacity={opacity}>
      {ringShadow && (
        <g fill={ringShadow} opacity={0.2} transform="translate(0.45 1)">
          {transforms.map((t, i) => (
            <path key={i} d={d} transform={t} />
          ))}
        </g>
      )}
      <g fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
        {transforms.map((t, i) => (
          <path key={i} d={d} transform={t} />
        ))}
      </g>
      {ringDetail && (
        <g
          fill="none"
          stroke={detailStroke ?? stroke}
          strokeWidth={detailWidth}
          opacity={detailOpacity}
        >
          {transforms.map((t, i) => (
            <path key={i} d={ringDetail} transform={t} />
          ))}
        </g>
      )}
    </g>
  );
}

export interface LightingProps {
  id: string;
  /** Radius of the lit area: roughly the flower's own radius. */
  radius?: number;
  strength?: number;
}

/**
 * Soft light from the top left over a whole bloom: a pale glow on the near
 * shoulder that fades to nothing well inside the flower's edge. There is
 * deliberately no matching shade: on open flowers (lily, orchid) the far side
 * has gaps, and a shade there smudges the background. Ring shadows supply the
 * depth instead. Skip it in mono mode.
 */
export function Lighting({
  id,
  radius = 30,
  strength = 1,
}: LightingProps): ReactElement | null {
  const lite = useContext(ArtDetailContext) === 'lite';
  if (lite) return null;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={`${id}-light`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.36 * strength} />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        cx={CENTER - radius * 0.32}
        cy={CENTER - radius * 0.36}
        r={radius * 0.72}
        fill={`url(#${id}-light)`}
      />
    </g>
  );
}

export interface RadialFillProps {
  id: string;
  /** Radius in flower units; stops run from the heart outward. */
  r: number;
  stops: readonly (readonly [number, string])[];
  /** The ring's `offset`: how far each petal's base sits from the heart. */
  offset?: number;
}

/**
 * A radial gradient for a ring of petals, centred on the heart of the flower.
 *
 * Gradients in user space are resolved in the coordinate system of the shape
 * that uses them, and every petal in a ring is drawn in its own rotated frame
 * with its base at the origin. So the heart is at (0, offset) for every petal,
 * not at (50, 50): centring there lets one gradient shade each petal from its
 * base to its tip, deep where the petals crowd together and light where they
 * open out.
 */
export function RadialFill({ id, r, stops, offset = 0 }: RadialFillProps): ReactElement {
  return (
    <radialGradient id={id} cx={0} cy={offset} r={r} gradientUnits="userSpaceOnUse">
      {stops.map(([at, color]) => (
        <stop key={at} offset={at} stopColor={color} />
      ))}
    </radialGradient>
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
