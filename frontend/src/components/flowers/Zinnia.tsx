import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import {
  CENTER,
  flowerPalette,
  petalPath,
  toned,
  transformFor,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** Two faint parallel veins running up a ray, in petal space. */
function veins(length: number): string {
  return (
    `M-1.6 -4 C-2 ${-length * 0.4} -2.2 ${-length * 0.62} -2 ${-length * 0.82} ` +
    `M1.6 -4 C2 ${-length * 0.4} 2.2 ${-length * 0.62} 2 ${-length * 0.82}`
  );
}

/**
 * Zinnia: three tiers of broad, spoon-ended rays around a raised cone.
 *
 * The tiers overlap like roof tiles, each a little brighter than the one under
 * it and shading it. The cone is a dark red-brown dome ringed with tiny
 * five-pointed golden florets, the zinnia's signature detail.
 */
export default function Zinnia({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.3 : 0.6;
  const seed = (variant ?? 0) * 19 + 7;
  const shadow = mono ? undefined : darken(c, 0.5);
  const vein = mono ? undefined : darken(c, 0.24);
  const outer = 35 * v.open;

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-a`}
            r={40}
            offset={4}
            stops={[
              [0, darken(c, 0.34)],
              [0.4, darken(c, 0.06)],
              [0.85, c],
              [1, lighten(c, 0.16)],
            ]}
          />
          <RadialFill
            id={`${id}-b`}
            r={30}
            offset={3}
            stops={[
              [0, darken(c, 0.3)],
              [0.5, c],
              [1, lighten(c, 0.22)],
            ]}
          />
          <radialGradient id={`${id}-cone`} cx="0.4" cy="0.38" r="0.66">
            <stop offset="0" stopColor="#8a3a2a" />
            <stop offset="0.7" stopColor="#5a2118" />
            <stop offset="1" stopColor="#3a140e" />
          </radialGradient>
          <radialGradient id={`${id}-gold`} cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#ffe48a" />
            <stop offset="1" stopColor="#d9a22b" />
          </radialGradient>
        </defs>
      )}

      <PetalRing
        count={13 + v.extra}
        d={petalPath(outer, 10.5, 0.24, 0.76)}
        offset={4}
        phase={v.phase * 0.3}
        fill={mono ? p.paper : `url(#${id}-a)`}
        stroke={p.edge}
        strokeWidth={sw}
        jitter={0.5}
        seed={seed}
        detail={veins(outer)}
        detailStroke={vein}
        detailWidth={0.45}
        detailOpacity={0.3}
      />
      <PetalRing
        count={13}
        d={petalPath(28, 9.6, 0.24, 0.76)}
        phase={14 + v.phase}
        offset={3}
        fill={mono ? p.paper : `url(#${id}-b)`}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.5}
        seed={seed + 1}
        detail={veins(28)}
        detailStroke={vein}
        detailWidth={0.45}
        detailOpacity={0.3}
      />
      <PetalRing
        count={11}
        d={petalPath(20.5, 8, 0.24, 0.76)}
        phase={7 + v.phase * 1.7}
        offset={2.5}
        fill={mono ? p.paper : `url(#${id}-b)`}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.5}
        seed={seed + 2}
      />

      {/* The cone, and its crown of tiny golden florets. */}
      {!mono && (
        <circle cx={CENTER + 0.5} cy={CENTER + 1} r={9.2} fill="#2a0e0a" opacity={0.25} />
      )}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={7.4}
        fill={mono ? p.paper : `url(#${id}-cone)`}
        stroke={mono ? p.edge : '#2e100b'}
        strokeWidth={sw}
      />
      <g
        fill={mono ? p.paper : `url(#${id}-gold)`}
        stroke={mono ? p.edge : '#b7841c'}
        strokeWidth={sw * 0.8}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d="M0 -10.2 l1.9 2.1 -0.7 2.7 -2.4 -1.2 -2.4 1.2 -0.7 -2.7 Z"
            transform={transformFor(i * 40 + v.phase)}
          />
        ))}
      </g>
      {!mono && (
        <>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 137.508 * Math.PI) / 180;
            const r = 5.2 * Math.sqrt((i + 0.5) / 12);
            return (
              <circle
                key={i}
                cx={CENTER + r * Math.cos(a)}
                cy={CENTER + r * Math.sin(a)}
                r={0.55}
                fill="#e2a64a"
                opacity={0.7}
              />
            );
          })}
          <Lighting id={id} radius={38} strength={0.75} />
        </>
      )}
    </g>
  );
}
