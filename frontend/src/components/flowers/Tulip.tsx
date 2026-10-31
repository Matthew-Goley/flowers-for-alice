import { useId, type ReactElement } from 'react';
import { darken, lighten } from '../../lib/color';
import { flowerPalette, type FlowerArtProps } from './flowerGeometry';

/** Side petals, each used twice: drawn, and as the clip for the contact shadow. */
const LEFT =
  'M50 84 C38 83.5 27.5 75 25 59 C23 45 24 30 28.5 18 ' +
  'C29.6 15.6 31.4 15.8 32.6 18.4 C36.5 26.5 41 34 44.8 45 C48 55 50.5 69 50 84 Z';
const RIGHT =
  'M50 84 C62 83.5 72.5 75 75 59 C77 45 76 31.5 71.8 19.5 ' +
  'C70.8 17 69 17.2 67.8 19.8 C64 27.5 59.5 34.5 55.2 45 C52 55 49.5 69 50 84 Z';

/** The front petal, used twice: once for its contact shadow, once for itself. */
const FRONT =
  'M50 84.5 C41 84.5 33.5 77.5 32.2 64 C30.8 50 34.5 34.5 42.5 24.5 ' +
  'C45.2 21 48 18.4 50 16.5 C52 18.4 54.8 21 57.5 24.5 ' +
  'C65.5 34.5 69.2 50 67.8 64 C66.5 77.5 59 84.5 50 84.5 Z';

/**
 * Tulip: the favourite, so it gets more care than the rest.
 *
 * A closed goblet seen slightly from the front: narrow at the foot, widest
 * just below the middle, and opening into a crown of five tips, the front one
 * pointed and the others softly rounded. Back to front: the inner petals (two
 * shadowed tips), two side petals whose outer edges make the silhouette, and
 * a narrower front petal that carries the light and casts a soft contact
 * shadow onto the side petals. Each petal is shaded deep at the base and pale
 * at the tip, with a lit rim and a few fine veins, and the whole cup sits on a
 * small green receptacle where the stem meets it.
 *
 * Coordinates are absolute in the 0-100 box; the base of the cup is (50, 84).
 *
 * Gradients need ids that are unique per instance, because a bouquet holds
 * several tulips in different colours. Mono mode drops every gradient and
 * highlight and keeps the line work, with opaque paper fills as usual.
 */
export default function Tulip({ color, mono, paper }: FlowerArtProps): ReactElement {
  const p = flowerPalette(color, mono, paper);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sw = mono ? 1.4 : 0.9;

  const front = `tulip-front-${uid}`;
  const side = `tulip-side-${uid}`;
  const back = `tulip-back-${uid}`;
  const sheen = `tulip-sheen-${uid}`;
  const sides = `tulip-sides-${uid}`;

  const fill = (id: string) => (mono ? p.paper : `url(#${id})`);
  const tip = lighten(color, 0.42);
  const base = darken(color, 0.32);
  const leaf = mono ? p.paper : '#6d8c63';
  const leafEdge = mono ? p.edge : '#4f6b47';

  return (
    <g>
      {!mono && (
        <defs>
          <linearGradient
            id={front}
            x1="0"
            y1="82"
            x2="0"
            y2="16"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={darken(color, 0.26)} />
            <stop offset="0.32" stopColor={color} />
            <stop offset="0.8" stopColor={lighten(color, 0.16)} />
            <stop offset="1" stopColor={tip} />
          </linearGradient>
          <linearGradient
            id={side}
            x1="0"
            y1="82"
            x2="0"
            y2="12"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={base} />
            <stop offset="0.5" stopColor={darken(color, 0.12)} />
            <stop offset="1" stopColor={lighten(color, 0.24)} />
          </linearGradient>
          <linearGradient
            id={back}
            x1="0"
            y1="70"
            x2="0"
            y2="10"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={darken(color, 0.42)} />
            <stop offset="1" stopColor={darken(color, 0.04)} />
          </linearGradient>
          <clipPath id={sides}>
            <path d={LEFT} />
            <path d={RIGHT} />
          </clipPath>
          <radialGradient id={sheen} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
      )}

      {/* Receptacle: the swelling where the stem meets the cup. */}
      <path
        d="M44 81 C45 88 55 88 56 81 C53 82.8 47 82.8 44 81 Z"
        fill={leaf}
        stroke={leafEdge}
        strokeWidth={sw * 0.8}
      />

      {/* Inner petals: only their two tips show, rising behind the front one. */}
      <path
        d="M50 74 C39 66 36 44 39.5 16 C40.2 13.4 42 13.3 43.2 15.6 C45.4 20 47.6 23 50 25 C52.4 23 54.6 20 56.8 15.6 C58 13.3 59.8 13.4 60.5 16 C64 44 61 66 50 74 Z"
        fill={fill(back)}
        stroke={p.edge}
        strokeWidth={sw}
      />

      {/* Left petal: its outer edge is the left side of the silhouette. */}
      <path d={LEFT} fill={fill(side)} stroke={p.edge} strokeWidth={sw} />
      {/* Right petal, a near mirror; the tip sits a touch lower for life. */}
      <path d={RIGHT} fill={fill(side)} stroke={p.edge} strokeWidth={sw} />

      {!mono && (
        <>
          {/* The turned-back lip of each side petal: a pale crescent at the tip. */}
          <path
            d="M29.4 17 C31 26 35.2 32 40.8 36.5 C37.2 29.6 34 23.6 31.6 17.8 C30.9 16.6 30 16.4 29.4 17 Z"
            fill={lighten(color, 0.52)}
            opacity={0.9}
          />
          <path
            d="M70.8 18.6 C69.4 27 65.4 32.8 59.6 37 C63.4 30 66.6 24.6 68.8 19.2 C69.4 18.2 70.2 18 70.8 18.6 Z"
            fill={lighten(color, 0.52)}
            opacity={0.9}
          />
          {/* Contact shadow the front petal casts, falling only on the side petals. */}
          <g clipPath={`url(#${sides})`}>
            <path
              d={FRONT}
              fill="none"
              stroke={base}
              strokeWidth={3.4}
              opacity={0.22}
              transform="translate(0.4 0.9)"
            />
          </g>
        </>
      )}

      {/* Front petal: narrower than the cup, cupped, and the brightest part. */}
      <path d={FRONT} fill={fill(front)} stroke={p.edge} strokeWidth={sw} />

      {/* Veins: a centre crease and two fainter lines fanning out. */}
      <g fill="none" stroke={mono ? p.edge : darken(color, 0.3)} strokeLinecap="round">
        <path
          d="M50 81 C49.2 66 49.2 42 50 22"
          strokeWidth={sw * 0.9}
          opacity={mono ? 0.65 : 0.35}
        />
        <path
          d="M46 81 C40.5 70 38.5 52 41 35"
          strokeWidth={sw * 0.6}
          opacity={mono ? 0.4 : 0.2}
        />
        <path
          d="M54 81 C59.5 70 61.5 52 59 35"
          strokeWidth={sw * 0.6}
          opacity={mono ? 0.4 : 0.2}
        />
      </g>

      {!mono && (
        <>
          {/* Sheen on the front petal's left shoulder, where the light lands. */}
          <ellipse
            cx="40.5"
            cy="47"
            rx="4.6"
            ry="16"
            transform="rotate(12 40.5 47)"
            fill={`url(#${sheen})`}
          />
          {/* A thin lit rim along the front petal's upper left edge. */}
          <path
            d="M33.6 52 C34.5 40 38 31 43 24.5 C45.5 21 48 18.6 50 16.5"
            fill="none"
            stroke={tip}
            strokeWidth={0.8}
            opacity={0.75}
          />
        </>
      )}
    </g>
  );
}
