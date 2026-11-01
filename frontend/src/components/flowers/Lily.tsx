import type { ReactElement } from 'react';
import { darken, lighten, mix } from '../../lib/color';
import {
  CENTER,
  flowerPalette,
  pointedPetalPath,
  toned,
  transformFor,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** Freckles down the inner third of a tepal, as zero-length round-capped dashes. */
const FRECKLES =
  'M-2.2 -9 h0 M1.8 -10.5 h0 M-1.2 -13 h0 M2.6 -14.5 h0 M-2.6 -16.5 h0 M0.8 -18 h0';

/**
 * Lily: a six-pointed star of long, pointed tepals.
 *
 * Each tepal flushes green-gold in the throat, deepens to the full colour and
 * lifts toward the tip, with a deep central groove flanked by a pale ridge,
 * and a scatter of freckles near the base. The back three are broader and
 * shaded by the front three. Six long stamens arc out over the face with
 * rust anthers, around a green three-lobed stigma.
 */
export default function Lily({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.4 : 0.6;
  const seed = (variant ?? 0) * 31 + 17;
  const shadow = mono ? undefined : darken(c, 0.5);
  const length = 40 * v.open;
  const throat = mix(c, '#c9d77a', 0.55);
  const groove = `M0 -3 C0.7 ${-length * 0.35} 0.7 ${-length * 0.65} 0 ${-length * 0.94}`;
  const ridge = `M1.8 -5 C2.4 ${-length * 0.35} 2 ${-length * 0.62} 0.8 ${-length * 0.86}`;
  const stamens = [-112, -64, -18, 26, 72, 118].map((a) => a + (v.rng() - 0.5) * 14);
  const turn = v.phase * 0.4;

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-tepal`}
            r={44}
            offset={3}
            stops={[
              [0, throat],
              [0.22, mix(c, throat, 0.35)],
              [0.55, c],
              [1, lighten(c, 0.22)],
            ]}
          />
        </defs>
      )}

      {/* Back tepals, broader, and a shade deeper. */}
      <PetalRing
        count={3}
        d={pointedPetalPath(length, 19.5, 0.42)}
        phase={turn}
        offset={3}
        fill={mono ? p.paper : `url(#${id}-tepal)`}
        stroke={p.edge}
        strokeWidth={sw}
        jitter={0.35}
        seed={seed}
        detail={groove}
        detailStroke={mono ? undefined : darken(c, 0.3)}
        detailWidth={0.8}
        detailOpacity={0.5}
      />
      {!mono && (
        <g transform={`rotate(${turn} ${CENTER} ${CENTER})`} opacity={0.5}>
          {[0, 120, 240].map((a) => (
            <path
              key={a}
              d={ridge}
              transform={transformFor(a, 3)}
              fill="none"
              stroke={lighten(c, 0.5)}
              strokeWidth={0.8}
            />
          ))}
        </g>
      )}

      {/* Front tepals, narrower, casting shadow on the back three. */}
      <PetalRing
        count={3}
        d={pointedPetalPath(length * 0.96, 16.5, 0.45)}
        phase={60 + turn}
        offset={3}
        fill={mono ? p.paper : `url(#${id}-tepal)`}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.35}
        seed={seed + 1}
        detail={groove}
        detailStroke={mono ? undefined : darken(c, 0.3)}
        detailWidth={0.8}
        detailOpacity={0.5}
      />
      {!mono && (
        <>
          <g transform={`rotate(${60 + turn} ${CENTER} ${CENTER})`} opacity={0.55}>
            {[0, 120, 240].map((a) => (
              <path
                key={a}
                d={ridge}
                transform={transformFor(a, 3)}
                fill="none"
                stroke={lighten(c, 0.5)}
                strokeWidth={0.8}
              />
            ))}
          </g>
          {/* Freckles on all six tepals. */}
          <g
            transform={`rotate(${turn} ${CENTER} ${CENTER})`}
            stroke={darken(c, 0.45)}
            strokeWidth={1.25}
            opacity={0.55}
          >
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path key={a} d={FRECKLES} transform={transformFor(a, 3)} />
            ))}
          </g>
          <circle cx={CENTER} cy={CENTER} r={6} fill={throat} opacity={0.6} />
        </>
      )}

      {/* Stamens: pale filaments arcing out, rust anthers. */}
      <g fill="none" stroke={mono ? p.edge : '#b9c27a'} strokeWidth={mono ? sw * 0.9 : 0.9}>
        {stamens.map((a) => (
          <path key={a} d="M0 0 C1.6 -7 2.6 -13 1.2 -19" transform={transformFor(a)} />
        ))}
      </g>
      {stamens.map((a) => (
        <ellipse
          key={a}
          cx={1.2}
          cy={-19.6}
          rx={2.7}
          ry={1.25}
          fill={mono ? p.paper : '#a8552a'}
          stroke={mono ? p.edge : '#6e3418'}
          strokeWidth={sw * 0.8}
          transform={`${transformFor(a)} rotate(${(a % 30) - 10} 1.2 -19.6)`}
        />
      ))}

      {/* Style and three-lobed stigma. */}
      <path
        d={`M${CENTER} ${CENTER} C${CENTER - 1} ${CENTER - 6} ${CENTER + 1.5} ${CENTER - 10} ${CENTER + 0.5} ${CENTER - 14}`}
        fill="none"
        stroke={mono ? p.edge : '#9fb35f'}
        strokeWidth={mono ? sw : 1.3}
      />
      <g
        fill={mono ? p.paper : '#7f9a45'}
        stroke={mono ? p.edge : '#5a7030'}
        strokeWidth={sw * 0.8}
      >
        {[0, 120, 240].map((a) => (
          <circle
            key={a}
            cx={CENTER + 0.5 + Math.sin((a * Math.PI) / 180) * 1.4}
            cy={CENTER - 14 - Math.cos((a * Math.PI) / 180) * 1.4}
            r={1.3}
          />
        ))}
      </g>

      {!mono && <Lighting id={id} radius={40} strength={0.8} />}
    </g>
  );
}
