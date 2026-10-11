/**
 * Occasion presets.
 *
 * Each one preloads the builder with a curated mix so a visitor who arrives
 * from /occasion/birthday starts at a bouquet worth sending rather than an
 * empty grid. The mixes are hand-picked to total 6 to 10 stems, which is the
 * range step 1 accepts.
 */

import type { FlowerType, GreeneryType, WrapStyle } from '../types/bouquet';
import type { BuilderState } from '../builder/builderState';

export interface Occasion {
  slug: string;
  title: string;
  /** Shown as the page heading above the builder. */
  heading: string;
  blurb: string;
  counts: Partial<Record<FlowerType, number>>;
  colors: Partial<Record<FlowerType, string>>;
  greenery: GreeneryType;
  wrap: WrapStyle;
  ribbon: string;
  /** Prefilled, and fully editable, message. */
  message: string;
}

export const OCCASIONS: readonly Occasion[] = [
  {
    slug: 'birthday',
    title: 'Birthday',
    heading: 'A birthday bouquet',
    blurb:
      'Warm, loud and cheerful. Sunflowers and zinnias, because a birthday is not the day for restraint.',
    counts: { sunflower: 2, zinnia: 2, dahlia: 2, daisy: 2 },
    colors: {
      sunflower: '#e8b14a',
      zinnia: '#e07a5f',
      dahlia: '#9f7bc0',
      daisy: '#fbf3e7',
    },
    greenery: 'fern',
    wrap: 'kraft',
    ribbon: '#e8b14a',
    message: 'Happy birthday. Hope today is exactly as good as you are.',
  },
  {
    slug: 'romantic',
    title: 'Romantic',
    heading: 'Something romantic',
    blurb: 'Roses, peonies and ranunculus in deep pinks, wrapped in lace. Quiet, not shouty.',
    counts: { rose: 3, peony: 2, ranunculus: 2, anemone: 1 },
    colors: {
      rose: '#cf6382',
      peony: '#f3bccb',
      ranunculus: '#e4879f',
      anemone: '#fbf3e7',
    },
    greenery: 'eucalyptus',
    wrap: 'lace',
    ribbon: '#cf6382',
    message: 'Thinking about you today, same as most days.',
  },
  {
    slug: 'thank-you',
    title: 'Thank you',
    heading: 'A thank-you bouquet',
    blurb:
      'Soft creams and sage with lilies and carnations. The bouquet equivalent of a handwritten note.',
    counts: { lily: 2, carnation: 2, tulip: 2, daisy: 1, orchid: 1 },
    colors: {
      lily: '#fbf3e7',
      carnation: '#e4879f',
      tulip: '#f0b27a',
      daisy: '#fbf3e7',
      orchid: '#c4a7d8',
    },
    greenery: 'babys-breath',
    wrap: 'linen',
    ribbon: '#7d9c70',
    message: 'Thank you, properly. It meant more than I probably said at the time.',
  },
];

export function findOccasion(slug: string | undefined): Occasion | null {
  if (!slug) return null;
  return OCCASIONS.find((occasion) => occasion.slug === slug) ?? null;
}

/** The slice of builder state an occasion preloads. */
export function occasionPreset(occasion: Occasion): Partial<BuilderState> {
  return {
    mode: 'bouquet',
    counts: { ...occasion.counts },
    colors: { ...occasion.colors },
    greenery: occasion.greenery,
    wrap: occasion.wrap,
    ribbon: occasion.ribbon,
    message: occasion.message,
  };
}
