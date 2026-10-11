import type { ReactElement } from 'react';
import { flowerPalette, pointedPetalPath, type FlowerArtProps } from './flowerGeometry';
import { PetalRing, SeedCenter } from './flowerKit';
import { darken } from '../../lib/color';

/**
 * Sunflower: two offset rings of narrow pointed rays around a big seeded disc.
 * The disc is always brown rather than a tint of the petal colour, because a
 * sunflower without its dark eye stops reading as a sunflower.
 */
export default function Sunflower({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.4 : 1;
  const disc = '#6b4f32';

  return (
    <g>
      <PetalRing
        count={17}
        d={pointedPetalPath(34, 7.5, 0.55)}
        offset={8}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={15}
        d={pointedPetalPath(28, 7, 0.55)}
        phase={12}
        offset={7}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <SeedCenter
        radius={15}
        fill={disc}
        stroke={mono ? p.edge : darken(disc, 0.3)}
        seeds={26}
        seedFill={darken(disc, 0.35)}
        mono={mono}
        paper={p.paper}
      />
    </g>
  );
}
