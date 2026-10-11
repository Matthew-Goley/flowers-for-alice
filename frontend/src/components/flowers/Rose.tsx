import type { ReactElement } from 'react';
import { CENTER, cuppedPetalPath, flowerPalette, type FlowerArtProps } from './flowerGeometry';
import { PetalRing } from './flowerKit';

/**
 * Rose: three cupped rings spiralling inward, finished with a tight whorl at
 * the heart. The rings step down in size and rotate against each other so the
 * eye reads a spiral rather than three concentric circles.
 */
export default function Rose({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.5 : 1.1;

  return (
    <g>
      <PetalRing
        count={6}
        d={cuppedPetalPath(33, 19)}
        offset={4}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={5}
        d={cuppedPetalPath(24, 15)}
        phase={34}
        offset={3}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={4}
        d={cuppedPetalPath(16, 11)}
        phase={68}
        offset={2}
        fill={p.petalLight}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* The furled bud at the centre, drawn as one continuous curl. */}
      <path
        d={`M${CENTER} ${CENTER + 5}
            C${CENTER - 7} ${CENTER + 4} ${CENTER - 7} ${CENTER - 6} ${CENTER} ${CENTER - 6}
            C${CENTER + 6} ${CENTER - 6} ${CENTER + 6} ${CENTER + 2} ${CENTER + 1} ${CENTER + 2}
            C${CENTER - 3} ${CENTER + 2} ${CENTER - 3} ${CENTER - 2} ${CENTER} ${CENTER - 2}`}
        fill="none"
        stroke={p.edge}
        strokeWidth={sw}
      />
    </g>
  );
}
