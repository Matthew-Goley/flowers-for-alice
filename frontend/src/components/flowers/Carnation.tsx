import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import {
  CENTER,
  flowerPalette,
  serratedPetalPath,
  toned,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** The rings, outermost first: count, length, width, teeth, offset. */
const RINGS: readonly (readonly [number, number, number, number, number])[] = [
  [11, 34, 12, 11, 2.5],
  [10, 28, 11, 10, 2],
  [10, 22.5, 9.5, 9, 1.6],
  [8, 17, 8, 8, 1.2],
  [6, 11, 6, 6, 0.6],
];

/** Fine veins running up into the frill, in petal space. */
function veins(length: number): string {
  return (
    `M0 -3 L-${(length * 0.14).toFixed(2)} -${(length * 0.78).toFixed(2)} ` +
    `M0 -3 L0 -${(length * 0.82).toFixed(2)} ` +
    `M0 -3 L${(length * 0.14).toFixed(2)} -${(length * 0.78).toFixed(2)}`
  );
}

/**
 * Carnation: a dense pompom of frilled, saw-edged petals.
 *
 * Five rings, heavily jittered, so the frills tumble over each other instead
 * of lining up. Each petal is streaked with fine veins and deepens at its
 * base; the tips are lit, which is what gives the frill its sparkle.
 */
export default function Carnation({
  color,
  mono,
  paper,
  variant,
}: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.2 : 0.5;
  const seed = (variant ?? 0) * 29 + 13;
  const shadow = mono ? undefined : darken(c, 0.5);
  const vein = mono ? undefined : darken(c, 0.2);

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-petal`}
            r={37}
            offset={2}
            stops={[
              [0, darken(c, 0.34)],
              [0.35, darken(c, 0.1)],
              [0.75, c],
              [1, lighten(c, 0.3)],
            ]}
          />
        </defs>
      )}

      {RINGS.map(([count, length, width, teeth, offset], ring) => {
        const l = ring === 0 ? length * v.open : length;
        return (
          <PetalRing
            key={ring}
            count={ring === 0 ? count + v.extra : count}
            d={serratedPetalPath(l, width, teeth)}
            phase={ring * 19 + v.phase * (ring + 1) * 0.5}
            offset={offset}
            fill={mono ? p.paper : `url(#${id}-petal)`}
            stroke={p.edge}
            strokeWidth={sw}
            shadow={ring === 0 ? undefined : shadow}
            jitter={0.95}
            seed={seed + ring}
            detail={ring < 3 ? veins(l) : undefined}
            detailStroke={vein}
            detailWidth={0.4}
            detailOpacity={0.3}
          />
        );
      })}

      {/* A tight frilled knot at the centre. */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={2.4}
        fill={mono ? p.paper : darken(c, 0.3)}
        stroke={p.edge}
        strokeWidth={sw}
      />

      {!mono && <Lighting id={id} radius={36} />}
    </g>
  );
}
