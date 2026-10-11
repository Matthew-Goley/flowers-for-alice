import type { ReactElement } from 'react';
import {
  CENTER,
  flowerPalette,
  pointedPetalPath,
  transformFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { PetalRing } from './flowerKit';

/**
 * Lily: six long recurved tepals in two offset threes, with the stamens drawn
 * explicitly. The anthers are what make a lily unmistakable at small sizes.
 */
export default function Lily({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.5 : 1.1;
  const tepal = pointedPetalPath(39, 17, 0.45);
  const stamenAngles = [-104, -68, -32, 4, 40] as const;

  return (
    <g>
      <PetalRing
        count={3}
        d={tepal}
        phase={0}
        offset={3}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={3}
        d={tepal}
        phase={60}
        offset={3}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* Freckles down the throat. */}
      {!mono &&
        [0, 60, 120, 180, 240, 300].map((angle) => (
          <circle
            key={angle}
            cx={CENTER}
            cy={CENTER - 13}
            r={1.3}
            fill={p.edge}
            opacity={0.55}
            transform={`rotate(${angle} ${CENTER} ${CENTER})`}
          />
        ))}
      <g stroke={p.edge} strokeWidth={sw * 0.9} fill="none">
        {stamenAngles.map((angle) => (
          <path key={angle} d="M0 0 C1.5 -8 2.5 -13 1 -18" transform={transformFor(angle)} />
        ))}
      </g>
      {stamenAngles.map((angle) => (
        <ellipse
          key={angle}
          cx={1}
          cy={-19}
          rx={2.6}
          ry={1.5}
          fill={mono ? p.paper : '#c98a3e'}
          stroke={p.edge}
          strokeWidth={sw * 0.8}
          transform={transformFor(angle)}
        />
      ))}
    </g>
  );
}
