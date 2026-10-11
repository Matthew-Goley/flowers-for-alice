import type { ReactElement } from 'react';
import { flowerPalette, type FlowerArtProps } from './flowerGeometry';
import { PetalRing, SeedCenter } from './flowerKit';

/**
 * Carnation: dense and frilly. The petal has a serrated top edge, built by
 * walking a shallow arc and alternating in and out, which is what gives the
 * flower its characteristic fringe.
 */
function frilledPetal(length: number, width: number, teeth = 5): string {
  const points: string[] = [
    `M0 0`,
    `C-${width} -${length * 0.3} -${width} -${length * 0.7} -${width * 0.72} -${length * 0.92}`,
  ];

  // Walk the tip from left to right, zig-zagging to cut the fringe.
  for (let i = 0; i <= teeth; i += 1) {
    const t = i / teeth;
    const x = -width * 0.72 + width * 1.44 * t;
    const notch = i % 2 === 0 ? length * 0.92 : length * 1.04;
    points.push(`L${x.toFixed(2)} -${notch.toFixed(2)}`);
  }

  points.push(`C${width} -${length * 0.7} ${width} -${length * 0.3} 0 0`, 'Z');
  return points.join(' ');
}

export default function Carnation({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const sw = mono ? 1.3 : 0.95;

  return (
    <g>
      <PetalRing
        count={11}
        d={frilledPetal(34, 12, 5)}
        offset={2}
        fill={p.petalDeep}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={10}
        d={frilledPetal(27, 11, 5)}
        phase={17}
        offset={2}
        fill={p.petal}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={9}
        d={frilledPetal(19, 9, 4)}
        phase={36}
        offset={1}
        fill={p.petalLight}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <PetalRing
        count={6}
        d={frilledPetal(11, 7, 3)}
        phase={58}
        fill={p.heart}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <SeedCenter
        radius={2.6}
        fill={p.heart}
        stroke={p.heartEdge}
        mono={mono}
        paper={p.paper}
      />
    </g>
  );
}
