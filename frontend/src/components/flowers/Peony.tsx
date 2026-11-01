import type { ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import {
  CENTER,
  cupLipPath,
  cuppedPetalPath,
  flowerPalette,
  ruffledPetalPath,
  toned,
  useArtId,
  variationFor,
  type FlowerArtProps,
} from './flowerGeometry';
import { Lighting, PetalRing, RadialFill } from './flowerKit';

/** Faint veins fanning up a petal, in petal space. */
function veins(length: number): string {
  const l = length;
  return (
    `M0 -3 C-1.5 ${-l * 0.35} -3 ${-l * 0.6} ${-l * 0.13} ${-l * 0.84} ` +
    `M0 -3 C0 ${-l * 0.4} 0 ${-l * 0.65} 0 ${-l * 0.9} ` +
    `M0 -3 C1.5 ${-l * 0.35} 3 ${-l * 0.6} ${l * 0.13} ${-l * 0.84}`
  );
}

/**
 * Peony: a full, blowsy bloom.
 *
 * Broad cupped guard petals hold a dense heart of crumpled ruffles. Nothing is
 * regular: every ring is jittered in spacing and size, the heart's rings are
 * pushed off centre by different amounts, and the ruffles are packed tighter
 * than they have room for, which is what makes a peony look overfull. The
 * colour deepens at the base of every petal and lifts almost to cream at the
 * ruffled edges, so the heart reads as lit from within.
 */
export default function Peony({ color, mono, paper, variant }: FlowerArtProps): ReactElement {
  const v = variationFor(variant);
  const c = toned(color, v.tone);
  const p = flowerPalette(c, mono, paper);
  const id = useArtId();
  const sw = mono ? 1.3 : 0.65;
  const seed = (variant ?? 0) * 17 + 3;

  const fill = (ring: string) => (mono ? p.paper : `url(#${id}-${ring})`);
  const shadow = mono ? undefined : darken(c, 0.45);
  const vein = mono ? undefined : darken(c, 0.22);
  const lip = mono ? undefined : lighten(c, 0.5);
  const guard = { length: 37 * v.open, width: 24 };

  return (
    <g>
      {!mono && (
        <defs>
          <RadialFill
            id={`${id}-a`}
            r={40}
            offset={3}
            stops={[
              [0, darken(c, 0.26)],
              [0.45, darken(c, 0.04)],
              [0.82, lighten(c, 0.14)],
              [1, lighten(c, 0.3)],
            ]}
          />
          <RadialFill
            id={`${id}-b`}
            r={30}
            stops={[
              [0, darken(c, 0.28)],
              [0.5, c],
              [1, lighten(c, 0.3)],
            ]}
          />
          <RadialFill
            id={`${id}-c`}
            r={20}
            stops={[
              [0, darken(c, 0.2)],
              [1, lighten(c, 0.4)],
            ]}
          />
        </defs>
      )}

      {/* Guard petals: broad cups, the outline of the whole bloom. */}
      <PetalRing
        count={7 + Math.max(0, v.extra)}
        d={cuppedPetalPath(guard.length, guard.width)}
        offset={3}
        phase={v.phase * 0.25}
        fill={fill('a')}
        stroke={p.edge}
        strokeWidth={sw}
        jitter={0.9}
        seed={seed}
        detail={veins(guard.length)}
        detailStroke={vein}
        detailWidth={0.45}
        detailOpacity={0.3}
      />
      <PetalRing
        count={8}
        d={ruffledPetalPath(30, 19, 3, 2.4)}
        phase={24 + v.phase}
        offset={2.5}
        fill={fill('a')}
        stroke={p.edge}
        strokeWidth={sw}
        shadow={shadow}
        jitter={0.9}
        seed={seed + 1}
        detail={veins(30)}
        detailStroke={vein}
        detailWidth={0.4}
        detailOpacity={0.24}
      />

      {/* The heart: crumpled ruffles, overpacked and off centre. */}
      <g transform={`translate(${(v.rng() - 0.5) * 2} ${(v.rng() - 0.5) * 2})`}>
        <PetalRing
          count={9}
          d={ruffledPetalPath(22, 13, 3, 2.2)}
          phase={47 + v.phase * 1.5}
          offset={2}
          fill={fill('b')}
          stroke={p.edge}
          strokeWidth={sw}
          shadow={shadow}
          jitter={1}
          seed={seed + 2}
        />
        <PetalRing
          count={10}
          d={ruffledPetalPath(16, 9.5, 2, 1.9)}
          phase={13 + v.phase * 2}
          offset={1.4}
          fill={fill('b')}
          stroke={p.edge}
          strokeWidth={sw}
          shadow={shadow}
          jitter={1}
          seed={seed + 3}
        />
        <PetalRing
          count={8}
          d={cuppedPetalPath(10.5, 7.5)}
          phase={31 + v.phase * 2.6}
          offset={0.8}
          fill={fill('c')}
          stroke={p.edge}
          strokeWidth={sw}
          shadow={shadow}
          jitter={1}
          seed={seed + 4}
          detail={cupLipPath(10.5, 7.5)}
          detailStroke={lip}
          detailWidth={0.7}
          detailOpacity={0.7}
        />
        <PetalRing
          count={5}
          d={cuppedPetalPath(6, 5)}
          phase={5 + v.phase * 3}
          fill={fill('c')}
          stroke={p.edge}
          strokeWidth={sw}
          shadow={shadow}
          jitter={1}
          seed={seed + 5}
        />
        {/* Light pooling in the folds at the very centre. */}
        {!mono && (
          <circle cx={CENTER} cy={CENTER} r={3.2} fill={lighten(c, 0.55)} opacity={0.6} />
        )}
      </g>

      {!mono && <Lighting id={id} radius={38} />}
    </g>
  );
}
