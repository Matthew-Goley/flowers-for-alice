import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
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

const EYE = '#f0bf3c';

/**
 * Daisy: two rings of slender, round-tipped rays around a domed golden eye.
 *
 * Each ray has a centre groove and is greyed slightly at the base, where it
 * dips under its neighbours, so even a white daisy has form. The eye is a
 * dome: bright at the top left, burnt gold at the rim, freckled with florets
 * on a spiral, and it casts a small shadow onto the rays.
 */
export default function Daisy({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone * 0.6);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.3 : 0.55;
  const seed = (variant ?? 0) * 7 + 2;
  const shadow = mono ? undefined : darken(c, 0.45);
  const groove = mono ? undefined : darken(c, 0.22);
  const eye = 10 + (v.rng() - 0.5) * 1.6;
  const ray = 35 * v.open;

  const florets = Array.from({ length: 34 }, (_, i) => {
    const angle = i * 137.508 * (Math.PI / 180);
    const r = eye * 0.82 * Math.sqrt((i + 0.5) / 34);
    return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle), i };
  });

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-ray`}
            r={40}
            offset={6}
            stops={[
              [0, darken(c, 0.22)],
              [0.3, darken(c, 0.05)],
              [0.7, c],
              [1, lighten(c, 0.3)],
            ]}
          />
          <radialGradient id={`${id}-eye`} cx="0.38" cy="0.36" r="0.68">
            <stop offset="0" stopColor="#ffe98f" />
            <stop offset="0.5" stopColor={EYE} />
            <stop offset="1" stopColor="#b97c14" />
          </radialGradient>
        </defs>
      )}

      <PetalRing
        count={16 + v.extra}
        d={petalPath(ray, 6.2, 0.18, 0.82)}
        offset={6}
        phase={v.phase * 0.3}
        fill={mono ? p.paper : `url(#${id}-ray)`}
        stroke={p.edge}
        strokeWidth={sw}
        jitter={0.7}
        seed={seed}
        detail={`M0 -7 L0 ${-ray * 0.86}`}
        detailStroke={groove}
        detailWidth={0.5}
        detailOpacity={0.4}
      />
      <PetalRing
        count={15}
        d={petalPath(31, 5.8, 0.18, 0.82)}
        phase={12 + v.phase}
        offset={6}
        fill={mono ? p.paper : `url(#${id}-ray)`}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.7}
        seed={seed + 1}
        detail="M0 -7 L0 -27"
        detailStroke={groove}
        detailWidth={0.5}
        detailOpacity={0.4}
      />

      {!mono && (
        <circle
          cx={CENTER + 0.5}
          cy={CENTER + 1.1}
          r={eye + 1.3}
          fill="#6b4a10"
          opacity={0.25}
        />
      )}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={eye}
        fill={mono ? p.paper : `url(#${id}-eye)`}
        stroke={mono ? p.edge : '#a8700f'}
        strokeWidth={sw}
      />
      {mono ? (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={eye * 0.58}
          fill="none"
          stroke={p.edge}
          strokeWidth={sw}
        />
      ) : (
        <>
          {florets.map((f) => (
            <circle
              key={f.i}
              cx={f.x}
              cy={f.y}
              r={0.62}
              fill={f.i % 2 ? '#c98a1e' : '#fff1b0'}
              opacity={f.i % 2 ? 0.75 : 0.7}
            />
          ))}
          <ellipse
            cx={CENTER - eye * 0.32}
            cy={CENTER - eye * 0.36}
            rx={eye * 0.42}
            ry={eye * 0.26}
            transform={`rotate(-32 ${CENTER - eye * 0.32} ${CENTER - eye * 0.36})`}
            fill="#ffffff"
            opacity={0.35}
          />
        </>
      )}

      {!mono && <Lighting id={id} radius={38} strength={0.6} />}
    </g>
  );
}
