import type { ReactElement } from 'react';
import { flowerPalette, petalPath, type FlowerArtProps } from './flowerGeometry';
import { PetalRing, SeedCenter } from './flowerKit';

/**
 * Peony: a loose, blowsy dome. Four rings of broad, blunt petals with heavy
 * overlap, getting paler toward the middle so the flower looks lit from above.
 */
export default function Peony({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.5 : 1.1;
  const ruffled = (length: number, width: number) => petalPath(length, width, 0.3, 0.62);

  return (
    <g>
      <PetalRing
        count={9}
        d={ruffled(36, 22)}
        offset={3}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={8}
        d={ruffled(28, 19)}
        phase={21}
        offset={2}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={7}
        d={ruffled(20, 15)}
        phase={45}
        fill={p.petalLight}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={5}
        d={ruffled(12, 10)}
        phase={70}
        fill={p.heart}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <SeedCenter
        radius={4.2}
        fill={p.heart}
        stroke={p.heartEdge}
        mono={mono}
        paper={p.paper}
      />
    </g>
  );
}
