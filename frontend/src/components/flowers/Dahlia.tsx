import type { ReactElement } from 'react';
import { flowerPalette, pointedPetalPath, type FlowerArtProps } from './flowerGeometry';
import { PetalRing, SeedCenter } from './flowerKit';

/**
 * Dahlia: the geometric one. Three rings of pointed, quill-like petals, each
 * ring rotated by half a step so the spacing stays even all the way in.
 */
export default function Dahlia({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.4 : 1;
  const quill = (length: number, width: number) => pointedPetalPath(length, width, 0.48);

  return (
    <g>
      <PetalRing
        count={10}
        d={quill(36, 11)}
        offset={3}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={10}
        d={quill(28, 10)}
        phase={18}
        offset={2}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={8}
        d={quill(19, 8)}
        phase={40}
        offset={1}
        fill={p.petalLight}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={6}
        d={quill(11, 6)}
        phase={62}
        fill={p.heart}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <SeedCenter
        radius={3.4}
        fill={p.heart}
        stroke={p.heartEdge}
        mono={mono}
        paper={p.paper}
      />
    </g>
  );
}
