/**
 * Drawing colours for flower art.
 *
 * The site is light only, so these are constants. They stay behind a hook so
 * components keep asking for colours rather than hard-coding them: mono art
 * needs `paper` as an opaque fill and `ink` inlined for its lines.
 */

import { INK_LIGHT, PAPER_LIGHT } from '../components/flowers/flowerGeometry';

const ART_COLORS = { paper: PAPER_LIGHT, ink: INK_LIGHT } as const;

export function useArtColors(): { paper: string; ink: string } {
  return ART_COLORS;
}
