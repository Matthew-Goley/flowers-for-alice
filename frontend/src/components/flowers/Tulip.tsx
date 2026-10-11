import type { ReactElement } from 'react';
import { flowerPalette, type FlowerArtProps } from './flowerGeometry';

/**
 * Tulip: a closed cup rather than an open face, so it is drawn as three
 * hand-plotted petals instead of a ring. The two outer petals splay just far
 * enough to show their tips either side of the front one, which is what keeps
 * it from reading as a single bud.
 *
 * Coordinates are absolute in the 0-100 box: the base is one point at (50, 74)
 * where the stem meets the cup, and all three petals spring from it.
 */
export default function Tulip({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.5 : 1.1;

  return (
    <g>
      {/* Back-left petal. */}
      <path
        d="M50 74 C27 65 20 43 29 23 C37 36 44 56 50 74 Z"
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* Back-right petal. */}
      <path
        d="M50 74 C73 65 80 43 71 23 C63 36 56 56 50 74 Z"
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* Front petal, taller and paler so it reads as nearest. */}
      <path
        d="M50 74 C31 64 30 36 50 16 C70 36 69 64 50 74 Z"
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* A soft seam gives the front petal some volume. */}
      <path
        d="M50 22 C46 38 46 56 50 68"
        fill="none"
        stroke={p.edge}
        strokeWidth={sw * 0.8}
        opacity={mono ? 0.7 : 0.45}
      />
    </g>
  );
}
