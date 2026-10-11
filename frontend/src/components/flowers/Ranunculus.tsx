import type { ReactElement } from 'react';
import { cuppedPetalPath, flowerPalette, type FlowerArtProps } from './flowerGeometry';
import { PetalRing } from './flowerKit';

/**
 * Ranunculus: the tightly packed one. Five shallow rings of small rounded
 * petals, each rotated against the last, stepping from the deepest tone at the
 * rim to the palest at the heart. No visible centre: the petals close over it.
 */
export default function Ranunculus({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.3 : 0.95;

  return (
    <g>
      <PetalRing
        count={9}
        d={cuppedPetalPath(33, 15)}
        offset={3}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={9}
        d={cuppedPetalPath(26, 13)}
        phase={20}
        offset={2}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={8}
        d={cuppedPetalPath(20, 11)}
        phase={42}
        offset={2}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={7}
        d={cuppedPetalPath(14, 9)}
        phase={64}
        offset={1}
        fill={p.petalLight}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={5}
        d={cuppedPetalPath(8, 7)}
        phase={86}
        fill={p.heart}
        stroke={p.edge}
        strokeWidth={sw}
      />
    </g>
  );
}
