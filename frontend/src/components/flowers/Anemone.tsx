import type { ReactElement } from 'react';
import {
  CENTER,
  flowerPalette,
  petalPath,
  transformFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { PetalRing } from './flowerKit';

/**
 * Anemone: six wide, softly overlapping petals around an unusually large
 * near-black centre, ringed with pale stamens. The contrast of that dark eye
 * is the whole character of the flower.
 */
export default function Anemone({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.5 : 1.1;
  const eye = '#312b3b';

  return (
    <g>
      <PetalRing
        count={6}
        d={petalPath(34, 23, 0.4, 0.82)}
        offset={2}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={6}
        d={petalPath(28, 20, 0.4, 0.82)}
        phase={30}
        offset={2}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* Stamen ring: short strokes radiating out of the dark eye. */}
      <g stroke={mono ? p.edge : '#4a4257'} strokeWidth={sw * 0.8} fill="none">
        {Array.from({ length: 18 }, (_, i) => (
          <path key={i} d="M0 -9 L0 -14" transform={transformFor(i * 20)} />
        ))}
      </g>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={9.5}
        fill={mono ? p.paper : eye}
        stroke={mono ? p.edge : '#201b28'}
        strokeWidth={sw}
      />
      {!mono && <circle cx={CENTER} cy={CENTER} r={4.5} fill="#1d1823" />}
    </g>
  );
}
