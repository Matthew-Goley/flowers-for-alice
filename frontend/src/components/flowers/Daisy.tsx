import type { ReactElement } from 'react';
import { flowerPalette, petalPath, type FlowerArtProps } from './flowerGeometry';
import { PetalRing, SeedCenter } from './flowerKit';
import { darken } from '../../lib/color';

/**
 * Daisy: two offset rings of slim, blunt rays around a domed yellow eye.
 * The back ring is slightly longer and darker, which reads as depth without
 * needing a gradient.
 */
export default function Daisy({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.4 : 1;
  const eye = '#f0bf3c';

  return (
    <g>
      <PetalRing
        count={13}
        d={petalPath(35, 7.5, 0.18, 0.8)}
        offset={6}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={13}
        d={petalPath(31, 7, 0.18, 0.8)}
        phase={14}
        offset={6}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <SeedCenter
        radius={11}
        fill={eye}
        stroke={mono ? p.edge : darken(eye, 0.4)}
        seeds={12}
        seedFill={darken(eye, 0.28)}
        mono={mono}
        paper={p.paper}
      />
    </g>
  );
}
