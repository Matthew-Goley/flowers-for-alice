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
 * Zinnia: flat, papery, and very evenly spaced, with a little crown of yellow
 * florets at the centre. Two rings only, so it stays graphic at small sizes.
 */
export default function Zinnia({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.4 : 1;
  const ray = (length: number, width: number) => petalPath(length, width, 0.24, 0.74);

  return (
    <g>
      <PetalRing
        count={12}
        d={ray(35, 11)}
        offset={4}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={12}
        d={ray(26, 10)}
        phase={15}
        offset={3}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {/* The ring of tiny five-pointed florets around the eye. */}
      <g
        fill={mono ? p.paper : '#f2cb5c'}
        stroke={mono ? p.edge : '#c79a25'}
        strokeWidth={sw * 0.75}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            d="M0 -9 l2.4 2.6 -0.9 3.4 -3 -1.6 -3 1.6 -0.9 -3.4 Z"
            transform={transformFor(i * 45)}
          />
        ))}
      </g>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={5}
        fill={p.heart}
        stroke={p.heartEdge}
        strokeWidth={sw}
      />
    </g>
  );
}
