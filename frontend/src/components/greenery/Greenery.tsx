/**
 * Filler greenery: foliage tucked in behind the blooms.
 *
 * Greenery used to fan out of the binding point and frame the bouquet from
 * the sides. It now fills the gaps instead: sprigs grow from behind each bloom
 * and from between neighbouring blooms, angled away from where the stems
 * gather, and the whole layer is masked to the bouquet's own shape (a soft
 * circle per bloom plus a bridge between close neighbours). So it shows in the
 * gaps between flowers and fades out just past their outline, rather than
 * fanning out or ending on a hard cut edge.
 * Drawn after the stems and before the blooms, so the flowers sit on a bed of
 * green.
 *
 * Placement is computed from the flowers, deterministically, so the same
 * bouquet always gets the same greenery on every surface.
 */

import { useId, type ReactElement } from 'react';
import { BINDING_POINT } from '../../lib/arrange';
import type { FlowerPlacement, GreeneryType } from '../../types/bouquet';

const GREEN_DARK = '#4a6646';
const GREEN_MID = '#6d8c63';
const GREEN_SOFT = '#93ac86';
const EUCALYPTUS = '#9bb5a4';

/** A repeatable number in [0, 1) for sprig `i`. */
function wobble(i: number, salt: number): number {
  const x = Math.sin(i * 91.345 + salt * 47.853) * 24634.6345;
  return x - Math.floor(x);
}

/** Bearing in degrees (0 = straight up, clockwise) from the binding point. */
function bearingFrom(x: number, y: number): number {
  return (Math.atan2(x - BINDING_POINT.x, BINDING_POINT.y - y) * 180) / Math.PI;
}

/** Blooms closer than this many bloom sizes count as neighbours. */
const NEIGHBOUR = 1.3;
/**
 * Mask radius per bloom, as a share of half its box. The art fills about 75%
 * of its box; the mask is solid to `MASK_SOLID` of this radius and fades to
 * nothing at the edge, so green peeks just past the petals and dissolves.
 */
const OVERHANG = 0.95;
const MASK_SOLID = 0.72;

/**
 * The bed the greenery is masked to: a circle per bloom, plus a circle bridging
 * each pair of neighbours so the gap between them can fill with green too.
 */
function bedCircles(
  flowers: readonly FlowerPlacement[],
  bloomSize: number,
): { x: number; y: number; r: number }[] {
  const circles = flowers.map((f) => ({
    x: f.x,
    y: f.y,
    r: (bloomSize * f.scale * OVERHANG) / 2,
  }));
  for (let i = 0; i < flowers.length; i += 1) {
    for (let j = i + 1; j < flowers.length; j += 1) {
      const a = flowers[i];
      const b = flowers[j];
      if (!a || !b) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) > bloomSize * NEIGHBOUR) continue;
      circles.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: bloomSize * 0.36 });
    }
  }
  return circles;
}

interface Sprig {
  x: number;
  y: number;
  angle: number;
  length: number;
  key: string;
}

/**
 * Where the sprigs go: two behind every bloom, splayed either side of its own
 * bearing, plus one in the gap between each pair of close neighbours.
 */
function placeSprigs(flowers: readonly FlowerPlacement[], bloomSize: number): Sprig[] {
  const sprigs: Sprig[] = [];
  flowers.forEach((flower, i) => {
    const radius = (bloomSize * flower.scale) / 2;
    const bearing = bearingFrom(flower.x, flower.y);
    [-1, 1].forEach((side) => {
      sprigs.push({
        key: `b${i}${side}`,
        x: flower.x,
        y: flower.y,
        angle: bearing + side * (42 + wobble(i, side + 3) * 26),
        length: radius * (1.15 + wobble(i, side + 7) * 0.25),
      });
    });
  });

  for (let i = 0; i < flowers.length; i += 1) {
    for (let j = i + 1; j < flowers.length; j += 1) {
      const a = flowers[i];
      const b = flowers[j];
      if (!a || !b) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > bloomSize * NEIGHBOUR) continue;
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      sprigs.push({
        key: `g${i}-${j}`,
        x,
        y,
        angle: bearingFrom(x, y) + (wobble(i * 31 + j, 11) - 0.5) * 30,
        length: (bloomSize / 2) * (0.95 + wobble(i * 31 + j, 13) * 0.25),
      });
    }
  }
  return sprigs;
}

interface SprigArtProps {
  length: number;
  mono: boolean;
  paper: string;
  stroke: string;
  ids: { leaf: string; frond: string; bloom: string };
  seed: number;
}

/** Round, paired, silvery leaves up a gently curving stem. */
function EucalyptusSprig({
  length,
  mono,
  paper,
  stroke,
  ids,
  seed,
}: SprigArtProps): ReactElement {
  const leaves = 4;
  const lean = (wobble(seed, 1) - 0.5) * length * 0.3;
  return (
    <g>
      <path
        d={`M0 0 Q${lean} ${-length * 0.55} 0 ${-length}`}
        fill="none"
        stroke={stroke}
        strokeWidth={0.8}
      />
      {Array.from({ length: leaves }, (_, i) => {
        const t = 0.3 + (0.7 * i) / (leaves - 1);
        const y = -length * t;
        const x = lean * 2 * t * (1 - t);
        const r = 3.5 * (1.15 - 0.4 * t);
        return [-1, 1].map((side) => (
          <g
            key={`${i}${side}`}
            transform={`translate(${x + side * r * 0.95} ${y + (side > 0 ? r * 0.45 : 0)})`}
          >
            <ellipse
              rx={r}
              ry={r * 0.86}
              fill={mono ? paper : `url(#${ids.leaf})`}
              stroke={stroke}
              strokeWidth={0.6}
            />
            {!mono && (
              <path
                d={`M${-side * r * 0.85} 0 L${side * r * 0.6} 0`}
                stroke="#e6efe8"
                strokeWidth={0.4}
                opacity={0.55}
              />
            )}
          </g>
        ));
      })}
    </g>
  );
}

/** A pinnate frond: paired blades, two-tone, tapering to the tip. */
function FernSprig({ length, mono, paper, stroke, ids }: SprigArtProps): ReactElement {
  const pairs = 7;
  return (
    <g>
      <path d={`M0 0 L0 ${-length}`} fill="none" stroke={stroke} strokeWidth={0.8} />
      {Array.from({ length: pairs }, (_, i) => {
        const t = 0.2 + (0.8 * i) / (pairs - 1);
        const y = -length * t;
        const blade = length * 0.24 * (1.12 - 0.75 * t);
        return [-1, 1].map((side) => (
          <path
            key={`${i}${side}`}
            d={`M0 ${y} Q${side * blade * 0.7} ${y - blade * 0.08} ${side * blade} ${y - blade * 0.6}
                Q${side * blade * 0.55} ${y - blade * 0.18} 0 ${y}`}
            fill={mono ? paper : `url(#${ids.frond})`}
            stroke={stroke}
            strokeWidth={0.5}
          />
        ));
      })}
    </g>
  );
}

/** A cloud of tiny white blossoms on thread-thin, branching stems. */
function BabysBreathSprig({
  length,
  mono,
  paper,
  stroke,
  ids,
  seed,
}: SprigArtProps): ReactElement {
  const clusters = 4;
  return (
    <g>
      <path
        d={`M0 0 Q${(wobble(seed, 2) - 0.5) * length * 0.25} ${-length * 0.5} 0 ${-length}`}
        fill="none"
        stroke={stroke}
        strokeWidth={0.5}
      />
      {Array.from({ length: clusters }, (_, i) => {
        const t = 0.35 + (0.65 * i) / (clusters - 1);
        const y = -length * t;
        const x = (i % 2 === 0 ? -1 : 1) * length * (0.12 + wobble(seed + i, 4) * 0.1);
        const blooms = 6;
        return (
          <g key={i}>
            <path d={`M0 ${y + length * 0.08} L${x} ${y}`} stroke={stroke} strokeWidth={0.4} />
            {Array.from({ length: blooms }, (_, k) => {
              const a = (k / blooms) * Math.PI * 2 + wobble(seed + i, k) * 0.8;
              const d = 1.4 + wobble(seed + i * 7, k) * 1.6;
              const bx = x + Math.cos(a) * d;
              const by = y + Math.sin(a) * d;
              return (
                <g key={k}>
                  <circle
                    cx={bx}
                    cy={by}
                    r={1.05}
                    fill={mono ? paper : `url(#${ids.bloom})`}
                    stroke={mono ? stroke : '#cfd2c8'}
                    strokeWidth={0.3}
                  />
                  {!mono && <circle cx={bx} cy={by} r={0.28} fill="#e9e2b8" />}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

export interface GreeneryProps {
  kind: GreeneryType;
  flowers: readonly FlowerPlacement[];
  /** The canvas's nominal bloom size, so sprigs scale with the flowers. */
  bloomSize: number;
  mono: boolean;
  paper: string;
}

export default function Greenery({
  kind,
  flowers,
  bloomSize,
  mono,
  paper,
}: GreeneryProps): ReactElement | null {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (kind === 'none' || flowers.length === 0) return null;

  const ids = { leaf: `${uid}-leaf`, frond: `${uid}-frond`, bloom: `${uid}-bloom` };
  const bed = `${uid}-bed`;
  const stroke = mono ? 'currentColor' : GREEN_DARK;
  const Sprig =
    kind === 'eucalyptus' ? EucalyptusSprig : kind === 'fern' ? FernSprig : BabysBreathSprig;
  const sprigs = placeSprigs(flowers, bloomSize);

  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id={`${bed}-fade`}>
          <stop offset={MASK_SOLID} stopColor="#ffffff" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <mask id={bed} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          {bedCircles(flowers, bloomSize).map((circle, i) => (
            <circle
              key={i}
              cx={circle.x}
              cy={circle.y}
              r={circle.r}
              fill={`url(#${bed}-fade)`}
            />
          ))}
        </mask>
      </defs>
      {!mono && (
        <defs>
          <radialGradient id={ids.leaf} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#c9d9cc" />
            <stop offset="0.6" stopColor={EUCALYPTUS} />
            <stop offset="1" stopColor="#6f8f7c" />
          </radialGradient>
          <linearGradient id={ids.frond} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={GREEN_SOFT} />
            <stop offset="1" stopColor={GREEN_MID} />
          </linearGradient>
          <radialGradient id={ids.bloom} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#ecebe4" />
          </radialGradient>
        </defs>
      )}
      <g mask={`url(#${bed})`}>
        {sprigs.map((sprig, i) => (
          <g
            key={sprig.key}
            transform={`translate(${sprig.x} ${sprig.y}) rotate(${sprig.angle})`}
          >
            <Sprig
              length={sprig.length}
              mono={mono}
              paper={paper}
              stroke={stroke}
              ids={ids}
              seed={i}
            />
          </g>
        ))}
      </g>
    </g>
  );
}
