import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import {
  CENTER,
  cupLipPath,
  cuppedPetalPath,
  flowerPalette,
  toned,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** Point at `deg` degrees (0 = up, clockwise) and radius `r` from the heart. */
function polar(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CENTER + r * Math.sin(rad), CENTER - r * Math.cos(rad)];
}

/**
 * Rose, seen from above: an open garden rose.
 *
 * Two rings of broad cupped petals open out around a spiral heart: inner
 * petals placed one at a time, each turned by the golden angle from the last
 * and a little smaller, so they overlap as a spiral rather than a stack of
 * rings, closing on a tight curl. That spiral is what says "rose" at a
 * glance. Petals deepen where they tuck in and catch light on their rolled
 * rims, and every petal shades the one beneath.
 */
export default function Rose({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.4 : 0.7;
  const seed = (variant ?? 0) * 43 + 29;
  const shadow = mono ? undefined : darken(c, 0.5);
  const lip = mono ? undefined : lighten(c, 0.5);

  const outer = { length: 34 * v.open, width: 22 };
  const spin = v.phase * 4;
  const furls = Array.from({ length: 9 }, (_, k) => ({
    k,
    angle: spin + k * 137.5,
    length: 21 - k * 1.7,
    width: 15.5 - k * 1.05,
    offset: 2.2 - k * 0.2,
  }));
  const [curlX, curlY] = polar(spin + 40, 0.8);

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-a`}
            r={38}
            offset={3}
            stops={[
              [0, darken(c, 0.32)],
              [0.4, darken(c, 0.1)],
              [0.8, c],
              [1, lighten(c, 0.2)],
            ]}
          />
          <RadialFill
            id={`${id}-b`}
            r={30}
            offset={2.5}
            stops={[
              [0, darken(c, 0.34)],
              [0.5, darken(c, 0.04)],
              [1, lighten(c, 0.18)],
            ]}
          />
          <radialGradient id={`${id}-furl`} cx={0} cy={2} r={21} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={darken(c, 0.3)} />
            <stop offset="0.5" stopColor={c} />
            <stop offset="1" stopColor={lighten(c, 0.24)} />
          </radialGradient>
        </defs>
      )}

      <PetalRing
        count={5 + Math.max(0, v.extra)}
        d={cuppedPetalPath(outer.length, outer.width)}
        offset={3}
        phase={v.phase * 0.3}
        fill={mono ? p.paper : `url(#${id}-a)`}
        stroke={p.edge}
        strokeWidth={sw}
        jitter={0.5}
        seed={seed}
        detail={cupLipPath(outer.length, outer.width)}
        detailStroke={lip}
        detailWidth={0.9}
        detailOpacity={0.5}
      />
      <PetalRing
        count={5}
        d={cuppedPetalPath(27, 18)}
        phase={36 + v.phase}
        offset={2.5}
        fill={mono ? p.paper : `url(#${id}-b)`}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.5}
        seed={seed + 1}
        detail={cupLipPath(27, 18)}
        detailStroke={lip}
        detailWidth={0.85}
        detailOpacity={0.5}
      />

      {/* The spiral heart, outermost petal first so each smaller one sits on top. */}
      {furls.map((f) => (
        <PetalRing
          key={f.k}
          count={1}
          d={cuppedPetalPath(f.length, f.width)}
          phase={f.angle}
          offset={f.offset}
          fill={mono ? p.paper : `url(#${id}-furl)`}
          stroke={p.edge}
          strokeWidth={sw}
          shadow={shadow}
          detail={cupLipPath(f.length, f.width)}
          detailStroke={lip}
          detailWidth={0.8}
          detailOpacity={0.7}
        />
      ))}
      {/* The last curl, still wrapped tight. */}
      <path
        d={`M${curlX - 2.6} ${curlY + 1} C${curlX - 3} ${curlY - 2.6} ${curlX + 2.4} ${curlY - 3} ${curlX + 2.4} ${curlY} C${curlX + 2.4} ${curlY + 2} ${curlX - 0.6} ${curlY + 2.2} ${curlX - 0.8} ${curlY}`}
        fill="none"
        stroke={mono ? p.edge : darken(c, 0.5)}
        strokeWidth={sw * 1.2}
      />

      {!mono && <Lighting id={id} radius={36} />}
    </g>
  );
}
