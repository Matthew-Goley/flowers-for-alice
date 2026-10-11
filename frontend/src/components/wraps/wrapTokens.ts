/**
 * Sleeve geometry and the five paper styles.
 *
 * Split out from `WrapPaper.tsx` so that file exports only components. The
 * coordinates are in the bouquet's 0-100 canvas space and are mirrored by the
 * server-side painter in `backend/app/og_render.py`.
 */

import type { WrapStyle } from '../../types/bouquet';

export const RIM_Y = 56;
export const FOOT_Y = 93;
export const RIM_HALF = 29;
export const FOOT_HALF = 7.5;

/** Where the ribbon is tied. */
export const KNOT = { x: 50, y: 74 } as const;

/**
 * The sleeve: a tapered cone whose rim sags in the middle, so it reads as an
 * opening the stems come out of rather than a triangle.
 */
export const SLEEVE_PATH = `M${50 - RIM_HALF} ${RIM_Y}
  Q50 ${RIM_Y + 12} ${50 + RIM_HALF} ${RIM_Y}
  L${50 + FOOT_HALF} ${FOOT_Y - 2}
  Q50 ${FOOT_Y + 2} ${50 - FOOT_HALF} ${FOOT_Y - 2} Z`;

/** The far half of the cone, painted a shade darker for depth. */
export const SHADOW_PATH = `M50 ${RIM_Y + 6}
  Q${50 + RIM_HALF / 2} ${RIM_Y + 4.5} ${50 + RIM_HALF} ${RIM_Y}
  L${50 + FOOT_HALF} ${FOOT_Y - 2}
  Q50 ${FOOT_Y + 2} 50 ${FOOT_Y} Z`;

/**
 * The closed-over top of an unopened bouquet: paper gathered up and pinched
 * at the neck, so a sealed gift reads as a parcel rather than an empty cone.
 */
export const SEALED_TOP_PATH = `M${50 - RIM_HALF} ${RIM_Y + 2}
  C${50 - RIM_HALF - 1} ${RIM_Y - 22} ${50 - 15} ${RIM_Y - 40} 50 ${RIM_Y - 44}
  C${50 + 15} ${RIM_Y - 40} ${50 + RIM_HALF + 1} ${RIM_Y - 22} ${50 + RIM_HALF} ${RIM_Y + 2}
  Q50 ${RIM_Y + 14} ${50 - RIM_HALF} ${RIM_Y + 2} Z`;

export interface WrapTone {
  base: string;
  deep: string;
  label: string;
  description: string;
}

export const WRAP_TONES: Record<WrapStyle, WrapTone> = {
  kraft: {
    base: '#d8b58c',
    deep: '#c09a6f',
    label: 'Kraft',
    description: 'Plain brown paper, folded once',
  },
  linen: {
    base: '#ece2d4',
    deep: '#d9cbb8',
    label: 'Linen',
    description: 'Soft woven cloth',
  },
  lace: {
    base: '#fbf5f2',
    deep: '#ead9de',
    label: 'Lace',
    description: 'Scalloped and fine',
  },
  gingham: {
    base: '#f3dfe0',
    deep: '#dcb5bb',
    label: 'Gingham',
    description: 'Picnic checks',
  },
  vellum: {
    base: '#f7eee6',
    deep: '#e6d7cb',
    label: 'Vellum',
    description: 'Translucent, pleated',
  },
};
