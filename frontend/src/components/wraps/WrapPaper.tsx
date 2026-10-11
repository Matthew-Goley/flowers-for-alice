/**
 * The paper sleeve and its ribbon.
 *
 * The silhouette is a tapered cone whose rim sags in the middle, so it reads
 * as an opening the stems come out of rather than a triangle. Each style adds
 * its own surface pattern on top of the same shape.
 *
 * Patterns are declared in a <defs> inside this component with ids derived
 * from React's useId, because a page can hold several bouquets at once and
 * duplicate ids would cross-wire their fills. The colons React puts in those
 * ids are stripped: they are legal in an id attribute but trip up url()
 * references in some renderers.
 */

import { useId, type ReactElement } from 'react';
import type { WrapStyle } from '../../types/bouquet';
import {
  FOOT_Y,
  KNOT,
  RIM_HALF,
  RIM_Y,
  SEALED_TOP_PATH,
  SHADOW_PATH,
  SLEEVE_PATH,
  WRAP_TONES,
} from './wrapTokens';
import { darken, lighten } from '../../lib/color';

function Pattern({ style, id, mono }: { style: WrapStyle; id: string; mono: boolean }) {
  if (mono) return null;
  const tone = WRAP_TONES[style];

  switch (style) {
    case 'gingham':
      return (
        <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill={tone.base} />
          <rect width="3.5" height="7" fill={lighten(tone.base, 0.3)} opacity={0.75} />
          <rect width="7" height="3.5" fill={lighten(tone.base, 0.3)} opacity={0.55} />
        </pattern>
      );
    case 'linen':
      return (
        <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill={tone.base} />
          <path d="M0 2.5h5" stroke={darken(tone.base, 0.08)} strokeWidth="0.7" />
          <path d="M2.5 0v5" stroke={darken(tone.base, 0.05)} strokeWidth="0.5" />
        </pattern>
      );
    case 'vellum':
      return (
        <pattern
          id={id}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(18)"
        >
          <rect width="8" height="8" fill={tone.base} />
          <path d="M0 0v8" stroke={lighten(tone.base, 0.5)} strokeWidth="2.4" />
        </pattern>
      );
    case 'lace':
      return (
        <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill={tone.base} />
          <circle cx="4.5" cy="4.5" r="1.7" fill="none" stroke={tone.deep} strokeWidth="0.6" />
          <circle cx="0" cy="0" r="1" fill={tone.deep} opacity="0.45" />
          <circle cx="9" cy="9" r="1" fill={tone.deep} opacity="0.45" />
        </pattern>
      );
    case 'kraft':
    default:
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={tone.base} />
          <path d="M0 5h10" stroke={darken(tone.base, 0.06)} strokeWidth="0.4" opacity="0.6" />
        </pattern>
      );
  }
}

export interface RibbonProps {
  color: string;
  mono: boolean;
  paper: string;
}

export function Ribbon({ color, mono, paper }: RibbonProps): ReactElement {
  const fill = mono ? paper : color;
  const edge = mono ? 'currentColor' : darken(color, 0.35);

  return (
    <g transform={`translate(${KNOT.x} ${KNOT.y})`} aria-hidden="true">
      {/* Tails first, so the loops and knot sit over them. */}
      <path
        d="M-1.5 2 C-5 9 -8 13 -11 16 L-6 15.5 L-2 5 Z"
        fill={mono ? paper : darken(color, 0.1)}
        stroke={edge}
        strokeWidth={0.9}
      />
      <path
        d="M1.5 2 C5 9 8 13 11 16 L6 15.5 L2 5 Z"
        fill={mono ? paper : darken(color, 0.1)}
        stroke={edge}
        strokeWidth={0.9}
      />
      {/* Loops. */}
      <path
        d="M-1 0 C-8 -8 -16 -6 -14 0 C-13 4 -6 4 -1 1 Z"
        fill={fill}
        stroke={edge}
        strokeWidth={0.9}
      />
      <path
        d="M1 0 C8 -8 16 -6 14 0 C13 4 6 4 1 1 Z"
        fill={fill}
        stroke={edge}
        strokeWidth={0.9}
      />
      <ellipse rx="2.6" ry="2.2" fill={fill} stroke={edge} strokeWidth={0.9} />
    </g>
  );
}

export interface WrapPaperProps {
  style: WrapStyle;
  mono: boolean;
  paper: string;
  /** Draw the paper closed over the top, hiding the flowers inside. */
  sealed?: boolean;
}

export default function WrapPaper({
  style,
  mono,
  paper,
  sealed = false,
}: WrapPaperProps): ReactElement {
  const rawId = useId();
  const patternId = `wrap-${style}-${rawId.replace(/:/g, '')}`;
  const tone = WRAP_TONES[style];
  const edge = mono ? 'currentColor' : darken(tone.deep, 0.3);

  return (
    <g aria-hidden="true">
      <defs>
        <Pattern style={style} id={patternId} mono={mono} />
      </defs>

      <path
        d={SLEEVE_PATH}
        fill={mono ? paper : `url(#${patternId})`}
        stroke={edge}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {!mono && <path d={SHADOW_PATH} fill={tone.deep} opacity={0.42} />}
      {/* The fold running down the front of the cone. */}
      <path
        d={`M50 ${RIM_Y + 6} L50 ${FOOT_Y}`}
        stroke={edge}
        strokeWidth={0.9}
        opacity={mono ? 0.7 : 0.5}
        fill="none"
      />
      {sealed && (
        <g>
          <path
            d={SEALED_TOP_PATH}
            fill={mono ? paper : `url(#${patternId})`}
            stroke={edge}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          {/* Creases radiating from the pinch at the top. */}
          {[-16, -6, 6, 16].map((offset) => (
            <path
              key={offset}
              d={`M${50 + offset * 0.3} ${RIM_Y - 38} Q${50 + offset} ${RIM_Y - 16} ${
                50 + offset * 1.5
              } ${RIM_Y + 1}`}
              fill="none"
              stroke={edge}
              strokeWidth={0.8}
              opacity={mono ? 0.6 : 0.35}
            />
          ))}
        </g>
      )}

      {/* Scalloped rim, the one style whose edge is part of its character. */}
      {!sealed &&
        style === 'lace' &&
        Array.from({ length: 11 }, (_, i) => {
          const t = i / 10;
          const x = 50 - RIM_HALF + 2 * RIM_HALF * t;
          const y = RIM_Y + 6 * Math.sin(Math.PI * t);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={2.4}
              fill={mono ? paper : tone.base}
              stroke={edge}
              strokeWidth={0.8}
            />
          );
        })}
    </g>
  );
}
