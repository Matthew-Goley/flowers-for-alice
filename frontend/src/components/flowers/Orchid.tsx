import type { ReactElement } from 'react';
import { darken, lighten, mix } from '../../lib/color';
import {
  CENTER,
  flowerPalette,
  petalPath,
  toned,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** Fine veins radiating from the base of a petal, in petal space. */
function veins(length: number, spread: number): string {
  return [-2, -1, 0, 1, 2]
    .map((k) => {
      const x = k * spread;
      return `M0 -2 C${(x * 0.4).toFixed(2)} ${(-length * 0.35).toFixed(2)} ${(x * 0.9).toFixed(2)} ${(-length * 0.6).toFixed(2)} ${x.toFixed(2)} ${(-length * 0.84).toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Orchid: a moth orchid, face on.
 *
 * Three sepals (one up, two down and out) sit behind two broad, round petals.
 * Every one is flushed deeper at the base with fine radiating veins and lifts
 * to a pale edge. In front: the lip, a deeper, more saturated tongue with
 * curled side lobes, a golden callus and a spatter of spots, under a waxy
 * cream column.
 */
export default function Orchid({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.4 : 0.6;
  const seed = (variant ?? 0) * 37 + 19;
  const shadow = mono ? undefined : darken(c, 0.5);
  const vein = mono ? undefined : darken(c, 0.3);
  const lipColor = mix(darken(c, 0.25), '#b0306a', 0.3);
  const tilt = (v.rng() - 0.5) * 8;
  const open = v.open;

  const petal = (
    angle: number,
    length: number,
    width: number,
    gradient: string,
    withShadow: boolean,
    s: number,
  ) => (
    <PetalRing
      count={1}
      phase={angle + tilt}
      d={petalPath(length * open, width, 0.3, 0.62)}
      offset={1}
      fill={mono ? p.paper : `url(#${id}-${gradient})`}
      stroke={p.edge}
      strokeWidth={sw}
      shadow={withShadow ? shadow : undefined}
      jitter={0.5}
      seed={seed + s}
      detail={veins(length * open, width * 0.22)}
      detailStroke={vein}
      detailWidth={0.4}
      detailOpacity={0.3}
    />
  );

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-sepal`}
            r={34}
            offset={1}
            stops={[
              [0, darken(c, 0.3)],
              [0.4, darken(c, 0.06)],
              [1, lighten(c, 0.2)],
            ]}
          />
          <RadialFill
            id={`${id}-petal`}
            r={38}
            offset={1}
            stops={[
              [0, darken(c, 0.32)],
              [0.3, c],
              [0.85, lighten(c, 0.22)],
              [1, lighten(c, 0.34)],
            ]}
          />
          <radialGradient id={`${id}-lip`} cx="0.5" cy="0.25" r="0.85">
            <stop offset="0" stopColor={darken(lipColor, 0.25)} />
            <stop offset="0.6" stopColor={lipColor} />
            <stop offset="1" stopColor={lighten(lipColor, 0.2)} />
          </radialGradient>
          <radialGradient id={`${id}-column`} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset="1" stopColor="#e8d6b0" />
          </radialGradient>
        </defs>
      )}

      {/* Sepals: one up, two down and out, behind everything. */}
      {petal(0, 30, 12, 'sepal', false, 0)}
      {petal(-128, 30, 12.5, 'sepal', false, 1)}
      {petal(128, 30, 12.5, 'sepal', false, 2)}
      {/* The two broad petals. */}
      {petal(-56, 34, 21, 'petal', true, 3)}
      {petal(56, 34, 21, 'petal', true, 4)}

      {/* Lip: side lobes curling up, then the forked tongue. */}
      <path
        d={`M${CENTER - 3} ${CENTER + 4}
            C${CENTER - 12} ${CENTER + 1} ${CENTER - 15} ${CENTER + 9} ${CENTER - 9} ${CENTER + 13}
            C${CENTER - 6} ${CENTER + 11} ${CENTER - 4} ${CENTER + 8} ${CENTER - 3} ${CENTER + 4} Z`}
        fill={mono ? p.paper : `url(#${id}-lip)`}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <path
        d={`M${CENTER + 3} ${CENTER + 4}
            C${CENTER + 12} ${CENTER + 1} ${CENTER + 15} ${CENTER + 9} ${CENTER + 9} ${CENTER + 13}
            C${CENTER + 6} ${CENTER + 11} ${CENTER + 4} ${CENTER + 8} ${CENTER + 3} ${CENTER + 4} Z`}
        fill={mono ? p.paper : `url(#${id}-lip)`}
        stroke={p.edge}
        strokeWidth={sw}
      />
      <path
        d={`M${CENTER} ${CENTER + 5}
            C${CENTER - 8} ${CENTER + 9} ${CENTER - 8} ${CENTER + 19} ${CENTER - 4.5} ${CENTER + 24}
            C${CENTER - 6.5} ${CENTER + 28} ${CENTER - 3} ${CENTER + 29} ${CENTER} ${CENTER + 26}
            C${CENTER + 3} ${CENTER + 29} ${CENTER + 6.5} ${CENTER + 28} ${CENTER + 4.5} ${CENTER + 24}
            C${CENTER + 8} ${CENTER + 19} ${CENTER + 8} ${CENTER + 9} ${CENTER} ${CENTER + 5} Z`}
        fill={mono ? p.paper : `url(#${id}-lip)`}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {!mono && (
        <>
          {/* Golden callus at the throat of the lip. */}
          <ellipse
            cx={CENTER}
            cy={CENTER + 9}
            rx={3.4}
            ry={2.4}
            fill="#f2c64a"
            stroke="#c7922a"
            strokeWidth={0.5}
          />
          {/* Spots on the lip and the inner petals. */}
          <g fill={darken(lipColor, 0.35)} opacity={0.55}>
            {[
              [-2.6, 14],
              [2.4, 15.5],
              [0, 18],
              [-3.6, 19],
              [3.2, 20.5],
              [-1.2, 22],
              [-7, 6],
              [-9.5, 3.5],
              [7, 6],
              [9.2, 3.2],
            ].map(([x, y]) => (
              <circle
                key={`${x},${y}`}
                cx={CENTER + (x ?? 0)}
                cy={CENTER + (y ?? 0)}
                r={0.75}
              />
            ))}
          </g>
          <path
            d={`M${CENTER} ${CENTER + 7} L${CENTER} ${CENTER + 23}`}
            stroke={lighten(lipColor, 0.4)}
            strokeWidth={0.6}
            opacity={0.5}
          />
        </>
      )}

      {/* Column: the waxy hood at the centre. */}
      <path
        d={`M${CENTER} ${CENTER - 6.5}
            C${CENTER - 5.2} ${CENTER - 5.5} ${CENTER - 5} ${CENTER + 5.5} ${CENTER} ${CENTER + 6.5}
            C${CENTER + 5} ${CENTER + 5.5} ${CENTER + 5.2} ${CENTER - 5.5} ${CENTER} ${CENTER - 6.5} Z`}
        fill={mono ? p.paper : `url(#${id}-column)`}
        stroke={p.edge}
        strokeWidth={sw}
      />
      {!mono && (
        <>
          <circle cx={CENTER} cy={CENTER + 1.5} r={1.8} fill={darken(c, 0.4)} opacity={0.45} />
          <Lighting id={id} radius={38} strength={0.8} />
        </>
      )}
    </g>
  );
}
