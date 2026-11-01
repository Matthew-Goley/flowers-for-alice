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

/** Silky veins fanning across a broad petal, in petal space. */
function veins(length: number): string {
  return [-6, -3, 0, 3, 6]
    .map(
      (x) =>
        `M0 -9 C${x * 0.4} ${-length * 0.45} ${x * 0.85} ${-length * 0.7} ${x} ${-length * 0.9}`,
    )
    .join(' ');
}

/** Stamens: a ring of fine filaments, each tipped with a dark anther dot. */
const FILAMENT = 'M0 -9.5 L0 -14.5';
const ANTHER = 'M0 -15 h0';

/**
 * Anemone: six broad, silky petals around a striking dark eye.
 *
 * The petals overlap as one layer, three over three, with a pale halo at the
 * base (the classic anemone ring), satin veins, and colour that deepens
 * toward the rounded edge. The eye is an inky, glossy boss inside a crown of
 * fine stamens tipped with dark anthers.
 */
export default function Anemone({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.4 : 0.6;
  const seed = (variant ?? 0) * 41 + 23;
  const shadow = mono ? undefined : darken(c, 0.5);
  const vein = mono ? undefined : darken(c, 0.22);
  const length = 34 * v.open;
  const halo = mix(c, '#ffffff', 0.62);

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-petal`}
            r={38}
            offset={2}
            stops={[
              [0, halo],
              [0.32, halo],
              [0.5, lighten(c, 0.08)],
              [0.85, c],
              [1, darken(c, 0.08)],
            ]}
          />
          <radialGradient id={`${id}-eye`} cx="0.38" cy="0.34" r="0.7">
            <stop offset="0" stopColor="#4b4560" />
            <stop offset="0.55" stopColor="#24202f" />
            <stop offset="1" stopColor="#141119" />
          </radialGradient>
        </defs>
      )}

      <PetalRing
        count={3}
        d={petalPath(length, 23, 0.42, 0.84)}
        phase={v.phase * 0.4}
        offset={2}
        fill={mono ? p.paper : `url(#${id}-petal)`}
        stroke={p.edge}
        strokeWidth={sw}
        jitter={0.4}
        seed={seed}
        detail={veins(length)}
        detailStroke={vein}
        detailWidth={0.4}
        detailOpacity={0.25}
      />
      <PetalRing
        count={3 + Math.max(0, v.extra)}
        d={petalPath(length * 0.97, 22, 0.42, 0.84)}
        phase={60 + v.phase * 0.4}
        offset={2}
        fill={mono ? p.paper : `url(#${id}-petal)`}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.4}
        seed={seed + 1}
        detail={veins(length * 0.97)}
        detailStroke={vein}
        detailWidth={0.4}
        detailOpacity={0.25}
      />

      {/* Stamen crown. */}
      <PetalRing
        count={24}
        d={FILAMENT}
        fill="none"
        stroke={mono ? p.edge : '#3d3550'}
        strokeWidth={mono ? sw * 0.8 : 0.55}
        jitter={0.6}
        seed={seed + 2}
        detail={ANTHER}
        detailStroke={mono ? p.edge : '#1b1724'}
        detailWidth={1.5}
        detailOpacity={0.95}
      />

      {/* The boss: inky, domed and glossy. */}
      {!mono && (
        <circle cx={CENTER + 0.4} cy={CENTER + 0.9} r={9.6} fill="#0e0b12" opacity={0.25} />
      )}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={8.6}
        fill={mono ? p.paper : `url(#${id}-eye)`}
        stroke={mono ? p.edge : '#0e0b12'}
        strokeWidth={sw}
      />
      {!mono && (
        <>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * 137.508 * Math.PI) / 180;
            const r = 6 * Math.sqrt((i + 0.5) / 16);
            return (
              <circle
                key={i}
                cx={CENTER + r * Math.cos(a)}
                cy={CENTER + r * Math.sin(a)}
                r={0.55}
                fill="#5a536e"
                opacity={0.6}
              />
            );
          })}
          <ellipse
            cx={CENTER - 2.8}
            cy={CENTER - 3.2}
            rx={2.8}
            ry={1.6}
            transform={`rotate(-35 ${CENTER - 2.8} ${CENTER - 3.2})`}
            fill="#ffffff"
            opacity={0.28}
          />
          <Lighting id={id} radius={38} strength={0.75} />
        </>
      )}
    </g>
  );
}
