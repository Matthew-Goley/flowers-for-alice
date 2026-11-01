import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import {
  CENTER,
  flowerPalette,
  pointedPetalPath,
  toned,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** The rings, outermost first: count, petal length, petal width, offset. */
const RINGS: readonly (readonly [number, number, number, number])[] = [
  [12, 35, 13, 3],
  [12, 29.5, 12, 2.6],
  [11, 24, 10.5, 2.2],
  [10, 18.5, 9, 1.8],
  [8, 13, 7.2, 1.2],
  [6, 8, 5.2, 0.6],
];

/**
 * Dahlia: a decorative dahlia, six rings of pointed, quilled petals closing
 * into a tight bud of a centre.
 *
 * Every petal is folded along its midline, so it carries a pale crease where
 * the fold catches the light. The rings spiral and deepen toward the middle,
 * where the youngest petals are still cupped shut, and each ring shades the
 * one beneath: the stacked shadows are what make it read as a sphere.
 */
export default function Dahlia({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.2 : 0.55;
  const seed = (variant ?? 0) * 23 + 11;
  const shadow = mono ? undefined : darken(c, 0.55);
  const crease = mono ? undefined : lighten(c, 0.5);
  const twist = 15 + v.phase * 0.5;

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-petal`}
            r={38}
            offset={2}
            stops={[
              [0, darken(c, 0.34)],
              [0.3, darken(c, 0.12)],
              [0.7, c],
              [1, lighten(c, 0.24)],
            ]}
          />
        </defs>
      )}

      {RINGS.map(([count, length, width, offset], ring) => {
        const l = ring === 0 ? length * v.open : length;
        return (
          <PetalRing
            key={ring}
            count={ring === 0 ? count + v.extra : count}
            d={pointedPetalPath(l, width, 0.42)}
            phase={ring * twist}
            offset={offset}
            fill={mono ? p.paper : `url(#${id}-petal)`}
            stroke={p.edge}
            strokeWidth={sw}
            shadow={ring === 0 ? undefined : shadow}
            jitter={0.25}
            seed={seed + ring}
            detail={`M0 -2 C0.3 ${-l * 0.35} 0.3 ${-l * 0.6} 0 ${-l * 0.88}`}
            detailStroke={crease}
            detailWidth={ring < 3 ? 0.9 : 0.6}
            detailOpacity={0.7}
          />
        );
      })}

      {/* The bud at the very centre. */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={2.6}
        fill={mono ? p.paper : darken(c, 0.45)}
        stroke={p.edge}
        strokeWidth={sw}
      />

      {!mono && <Lighting id={id} radius={38} />}
    </g>
  );
}
