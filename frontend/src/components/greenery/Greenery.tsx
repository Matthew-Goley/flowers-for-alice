/**
 * Foliage behind the blooms.
 *
 * Three styles, all built from sprigs that radiate out of the binding point so
 * they read as part of the same hand-tied bunch. Drawn in the same 0-100 space
 * as the flowers, and always behind them.
 */

import type { ReactElement } from 'react';
import type { GreeneryType } from '../../types/bouquet';

const GREEN_DARK = '#4f6b4a';
const GREEN_MID = '#6d8c63';
const GREEN_SOFT = '#95ae84';

/**
 * Where the stems gather, and the angles the sprigs fan out along.
 *
 * Angles are measured from straight up. They are deliberately wide: foliage
 * aimed near the vertical disappears behind the blooms, and greenery only
 * earns its place if it frames the bouquet from outside the flower heads.
 */
const ORIGIN = { x: 50, y: 72 } as const;
const SPRIGS: readonly { angle: number; length: number }[] = [
  { angle: -104, length: 30 },
  { angle: -76, length: 40 },
  { angle: -46, length: 36 },
  { angle: 46, length: 36 },
  { angle: 76, length: 40 },
  { angle: 104, length: 30 },
];

interface SprigProps {
  length: number;
  stroke: string;
  fill: string;
  mono: boolean;
  paper: string;
}

/** Round, paired leaves marching up a drooping stem. */
function EucalyptusSprig({ length, stroke, fill, mono, paper }: SprigProps): ReactElement {
  const leaves = 6;
  return (
    <g>
      <path
        d={`M0 0 Q${length * 0.12} ${-length * 0.55} 0 ${-length}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1.2}
      />
      {Array.from({ length: leaves }, (_, i) => {
        const t = 0.22 + (0.78 * i) / (leaves - 1);
        const y = -length * t;
        const r = 3.6 * (1.1 - 0.45 * t);
        return (
          <g key={i}>
            <ellipse
              cx={-r * 1.1}
              cy={y}
              rx={r}
              ry={r * 0.82}
              fill={mono ? paper : fill}
              stroke={stroke}
              strokeWidth={1}
            />
            <ellipse
              cx={r * 1.1}
              cy={y + r * 0.5}
              rx={r}
              ry={r * 0.82}
              fill={mono ? paper : fill}
              stroke={stroke}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Pinnate fronds: paired blades angled up the stem. */
function FernSprig({ length, stroke, fill, mono, paper }: SprigProps): ReactElement {
  const pairs = 8;
  return (
    <g>
      <path d={`M0 0 L0 ${-length}`} fill="none" stroke={stroke} strokeWidth={1.2} />
      {Array.from({ length: pairs }, (_, i) => {
        const t = 0.16 + (0.84 * i) / (pairs - 1);
        const y = -length * t;
        const blade = length * 0.2 * (1.15 - 0.72 * t);
        return (
          <g key={i}>
            {[-1, 1].map((side) => (
              <path
                key={side}
                d={`M0 ${y} Q${side * blade * 0.7} ${y - blade * 0.1} ${side * blade} ${y - blade * 0.55}
                    Q${side * blade * 0.6} ${y - blade * 0.15} 0 ${y}`}
                fill={mono ? paper : fill}
                stroke={stroke}
                strokeWidth={0.9}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Clouds of tiny blossom on thread-thin stems. */
function BabysBreathSprig({ length, stroke, mono, paper }: SprigProps): ReactElement {
  const clusters = 5;
  return (
    <g>
      <path
        d={`M0 0 Q${-length * 0.1} ${-length * 0.5} 0 ${-length}`}
        fill="none"
        stroke={stroke}
        strokeWidth={0.9}
      />
      {Array.from({ length: clusters }, (_, i) => {
        const t = 0.3 + (0.7 * i) / (clusters - 1);
        const y = -length * t;
        // Alternate the clusters left and right of the stem.
        const x = (i % 2 === 0 ? -1 : 1) * length * 0.13;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d={`M${-x * 0.8} ${length * 0.05} L0 0`} stroke={stroke} strokeWidth={0.7} />
            {[0, 72, 144, 216, 288].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <circle
                  key={angle}
                  cx={Math.cos(rad) * 2.6}
                  cy={Math.sin(rad) * 2.6}
                  r={1.5}
                  fill={mono ? paper : '#fdfbf8'}
                  stroke={stroke}
                  strokeWidth={0.8}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

export interface GreeneryProps {
  kind: GreeneryType;
  mono: boolean;
  paper: string;
}

export default function Greenery({ kind, mono, paper }: GreeneryProps): ReactElement | null {
  if (kind === 'none') return null;

  const stroke = mono ? 'currentColor' : GREEN_DARK;
  const fill = kind === 'fern' ? GREEN_MID : GREEN_SOFT;
  const Sprig =
    kind === 'eucalyptus' ? EucalyptusSprig : kind === 'fern' ? FernSprig : BabysBreathSprig;

  return (
    <g aria-hidden="true">
      {SPRIGS.map((sprig, i) => (
        <g
          key={i}
          transform={`translate(${ORIGIN.x} ${ORIGIN.y}) rotate(${sprig.angle})`}
          opacity={mono ? 1 : 0.95}
        >
          <Sprig length={sprig.length} stroke={stroke} fill={fill} mono={mono} paper={paper} />
        </g>
      ))}
    </g>
  );
}
