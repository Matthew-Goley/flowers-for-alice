import type { ReactElement } from 'react';
import { CENTER, flowerPalette, petalPath, type FlowerArtProps } from './flowerGeometry';
import { PetalFan } from './flowerKit';

/**
 * Orchid (phalaenopsis): bilateral, not radial. Two broad dorsal petals, two
 * narrower lateral sepals, and a distinct three-lobed lip at the bottom with
 * the column sitting in front of it.
 */
export default function Orchid({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.5 : 1.1;

  return (
    <g>
      {/* Lateral sepals, angled down and out behind the big petals. */}
      <PetalFan
        angles={[-126, 126]}
        d={petalPath(31, 13, 0.26, 0.68)}
        offset={2}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* The two big dorsal petals. */}
      <PetalFan
        angles={[-48, 48]}
        d={petalPath(34, 20, 0.3, 0.6)}
        offset={1}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* Top sepal. */}
      <PetalFan
        angles={[0]}
        d={petalPath(28, 12, 0.26, 0.66)}
        offset={1}
        fill={p.petalLight}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* The lip: two side lobes and a notched tongue. */}
      <path
        d={`M${CENTER} ${CENTER + 4}
            C${CENTER - 13} ${CENTER + 8} ${CENTER - 14} ${CENTER + 20} ${CENTER - 5} ${CENTER + 24}
            C${CENTER - 2} ${CENTER + 29} ${CENTER + 2} ${CENTER + 29} ${CENTER + 5} ${CENTER + 24}
            C${CENTER + 14} ${CENTER + 20} ${CENTER + 13} ${CENTER + 8} ${CENTER} ${CENTER + 4} Z`}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* Column. */}
      <path
        d={`M${CENTER} ${CENTER - 6}
            C${CENTER - 5} ${CENTER - 5} ${CENTER - 5} ${CENTER + 6} ${CENTER} ${CENTER + 7}
            C${CENTER + 5} ${CENTER + 6} ${CENTER + 5} ${CENTER - 5} ${CENTER} ${CENTER - 6} Z`}
        fill={mono ? p.paper : '#f5e4bd'}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {!mono && <circle cx={CENTER} cy={CENTER + 1} r={2} fill={p.edge} opacity={0.4} />}
    </g>
  );
}
