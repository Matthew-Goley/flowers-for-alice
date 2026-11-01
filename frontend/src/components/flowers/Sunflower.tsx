import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import {
  CENTER,
  flowerPalette,
  pointedPetalPath,
  toned,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

const DISC = '#6b4f32';

/**
 * Sunflower: two rings of pointed rays around a big seeded disc.
 *
 * The rays are deeper at the base and brighter toward the tip, each with a
 * fine midrib. The disc is the showpiece: a dark rim, a ring of tiny green-gold
 * florets just inside it, then seeds laid out on the golden-angle spiral real
 * sunflowers use, in two tones, darkening toward a near-black centre. A soft
 * shadow under the disc lifts it off the rays.
 */
export default function Sunflower({
  color,
  mono,
  paper,
  variant,
}: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.3 : 0.6;
  const seed = (variant ?? 0) * 11 + 5;
  const shadow = mono ? undefined : darken(c, 0.5);
  const rib = mono ? undefined : darken(c, 0.28);
  const disc = 14.5 + (v.rng() - 0.5) * 2;
  const rayLength = 36 * v.open;

  const seeds = Array.from({ length: 70 }, (_, i) => {
    const angle = i * 137.508 * (Math.PI / 180);
    const r = disc * 0.8 * Math.sqrt((i + 0.6) / 70);
    return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle), r, i };
  });
  const florets = Array.from({ length: 28 }, (_, i) => {
    const angle = ((i * 360) / 28) * (Math.PI / 180);
    const r = disc * 0.9;
    return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
  });

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-ray`}
            r={44}
            offset={9}
            stops={[
              [0, darken(c, 0.32)],
              [0.32, darken(c, 0.06)],
              [0.75, c],
              [1, lighten(c, 0.2)],
            ]}
          />
          <radialGradient id={`${id}-disc`} cx="0.44" cy="0.42" r="0.6">
            <stop offset="0" stopColor="#2a1c10" />
            <stop offset="0.45" stopColor="#4a3420" />
            <stop offset="0.82" stopColor={DISC} />
            <stop offset="1" stopColor="#3a2716" />
          </radialGradient>
        </defs>
      )}

      <PetalRing
        count={18 + v.extra}
        d={pointedPetalPath(rayLength, 7.6, 0.55)}
        offset={9}
        phase={v.phase * 0.3}
        fill={mono ? p.paper : `url(#${id}-ray)`}
        stroke={p.edge}
        strokeWidth={sw}
        jitter={0.6}
        seed={seed}
        detail={`M0 -3 C-0.4 ${-rayLength * 0.35} -0.4 ${-rayLength * 0.65} 0 ${-rayLength * 0.9}`}
        detailStroke={rib}
        detailWidth={0.5}
        detailOpacity={0.45}
      />
      <PetalRing
        count={16}
        d={pointedPetalPath(30, 7, 0.55)}
        offset={8}
        phase={11 + v.phase}
        fill={mono ? p.paper : `url(#${id}-ray)`}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.6}
        seed={seed + 1}
        detail="M0 -3 C-0.4 -11 -0.4 -20 0 -27"
        detailStroke={rib}
        detailWidth={0.5}
        detailOpacity={0.45}
      />

      {/* Shadow the disc casts on the rays. */}
      {!mono && (
        <circle
          cx={CENTER + 0.6}
          cy={CENTER + 1.2}
          r={disc + 1.6}
          fill="#2a1c10"
          opacity={0.28}
        />
      )}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={disc}
        fill={mono ? p.paper : `url(#${id}-disc)`}
        stroke={mono ? p.edge : '#2e2012'}
        strokeWidth={sw}
      />

      {mono ? (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={disc * 0.6}
          fill="none"
          stroke={p.edge}
          strokeWidth={sw}
        />
      ) : (
        <>
          {/* Ring of open florets around the rim, catching the light. */}
          {florets.map((f, i) => (
            <circle key={`f${i}`} cx={f.x} cy={f.y} r={0.95} fill="#b9a24a" opacity={0.9} />
          ))}
          {/* Seeds on the golden-angle spiral, two tones, smaller to the centre. */}
          {seeds.map((s) => (
            <circle
              key={`s${s.i}`}
              cx={s.x}
              cy={s.y}
              r={0.5 + (s.r / disc) * 0.55}
              fill={s.i % 3 === 0 ? '#8a6a3c' : '#1f150b'}
              opacity={s.i % 3 === 0 ? 0.85 : 0.7}
            />
          ))}
          {/* A soft sheen across the dome of the disc. */}
          <ellipse
            cx={CENTER - disc * 0.3}
            cy={CENTER - disc * 0.34}
            rx={disc * 0.5}
            ry={disc * 0.32}
            transform={`rotate(-30 ${CENTER - disc * 0.3} ${CENTER - disc * 0.34})`}
            fill={lighten(DISC, 0.5)}
            opacity={0.16}
          />
        </>
      )}

      {!mono && <Lighting id={id} radius={40} strength={0.7} />}
    </g>
  );
}
