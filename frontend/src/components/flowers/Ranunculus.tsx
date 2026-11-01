import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import {
  CENTER,
  cupLipPath,
  cuppedPetalPath,
  flowerPalette,
  toned,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** The rings, outermost first: count, petal length, petal width. */
const RINGS: readonly (readonly [number, number, number])[] = [
  [9, 34, 15],
  [9, 28.5, 13.5],
  [8, 23.5, 12],
  [8, 19, 10.5],
  [7, 14.5, 8.5],
  [6, 10, 6.5],
];

/**
 * Ranunculus: dozens of thin, cupped petals packed in tight concentric rings
 * around a small green eye.
 *
 * The rings spiral (each is turned a little further than the last) so the
 * bloom reads as one swirl rather than a stack of rosettes. Every petal has a
 * pale rolled lip, and each ring shades the one under it.
 */
export default function Ranunculus({
  color,
  mono,
  paper,
  variant,
}: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.2 : 0.6;
  const shadow = mono ? undefined : darken(c, 0.55);
  const lip = mono ? undefined : lighten(c, 0.55);
  const twist = 17 + v.phase * 0.4;

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-petal`}
            r={37}
            stops={[
              [0, darken(c, 0.3)],
              [0.3, darken(c, 0.12)],
              [0.7, c],
              [1, lighten(c, 0.22)],
            ]}
          />
          <radialGradient id={`${id}-eye`} cx="0.4" cy="0.38" r="0.7">
            <stop offset="0" stopColor="#c8d98f" />
            <stop offset="0.6" stopColor="#7d9c56" />
            <stop offset="1" stopColor="#4f6b3a" />
          </radialGradient>
        </defs>
      )}

      {RINGS.map(([count, length, width], ring) => (
        <PetalRing
          key={ring}
          count={ring === 0 ? count + v.extra : count}
          d={cuppedPetalPath(ring === 0 ? length * v.open : length, width)}
          phase={ring * twist}
          offset={Math.max(0.6, 3 - ring * 0.45)}
          fill={mono ? p.paper : `url(#${id}-petal)`}
          stroke={p.edge}
          strokeWidth={sw}
          shadow={ring === 0 ? undefined : shadow}
          detail={cupLipPath(length, width)}
          detailStroke={lip}
          detailWidth={ring < 3 ? 0.9 : 0.7}
          detailOpacity={0.7}
          jitter={0.45}
          seed={(variant ?? 0) * 13 + ring + 1}
        />
      ))}

      {!mono && <Lighting id={id} radius={34} />}

      {/* The green eye, with a dark pinhole where the last petals meet. */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={3.6}
        fill={mono ? p.paper : `url(#${id}-eye)`}
        stroke={mono ? p.edge : '#3f5a30'}
        strokeWidth={sw}
      />
      {!mono && <circle cx={CENTER + 0.4} cy={CENTER + 0.5} r={1.1} fill="#33482a" />}
    </g>
  );
}
