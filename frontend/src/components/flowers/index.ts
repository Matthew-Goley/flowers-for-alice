/**
 * The flower catalog: art, names, colour defaults and the one-line meanings
 * used as builder tooltips. All copy here is original to this project.
 */

import type { FlowerType } from '../../types/bouquet';
import { FLOWER_TYPES } from '../../types/bouquet';
import type { FlowerArt } from './flowerGeometry';

import Anemone from './Anemone';
import Carnation from './Carnation';
import Dahlia from './Dahlia';
import Daisy from './Daisy';
import Lily from './Lily';
import Orchid from './Orchid';
import Peony from './Peony';
import Ranunculus from './Ranunculus';
import Rose from './Rose';
import Sunflower from './Sunflower';
import Tulip from './Tulip';
import Zinnia from './Zinnia';

export interface FlowerInfo {
  type: FlowerType;
  /** Display name, title case. */
  name: string;
  art: FlowerArt;
  /** One line, shown as a tooltip in the builder. */
  meaning: string;
  defaultColor: string;
  /** Colours that particularly suit this bloom, offered first in the picker. */
  suggested: readonly string[];
}

export const FLOWERS: Record<FlowerType, FlowerInfo> = {
  rose: {
    type: 'rose',
    name: 'Rose',
    art: Rose,
    meaning: 'Love, said plainly and without hedging.',
    defaultColor: '#cf6382',
    suggested: ['#cf6382', '#e4879f', '#f3bccb', '#fbf3e7'],
  },
  peony: {
    type: 'peony',
    name: 'Peony',
    art: Peony,
    meaning: 'Good fortune, and a wish for an easy year.',
    defaultColor: '#f3bccb',
    suggested: ['#f3bccb', '#e4879f', '#fbf3e7', '#c4a7d8'],
  },
  tulip: {
    type: 'tulip',
    name: 'Tulip',
    art: Tulip,
    meaning: 'A fresh start, like the first warm day after a long winter.',
    defaultColor: '#e07a5f',
    suggested: ['#e07a5f', '#f4d58d', '#cf6382', '#9f7bc0'],
  },
  sunflower: {
    type: 'sunflower',
    name: 'Sunflower',
    art: Sunflower,
    meaning: 'Loyalty that turns up every single day.',
    defaultColor: '#e8b14a',
    suggested: ['#e8b14a', '#f0b27a', '#f4d58d'],
  },
  lily: {
    type: 'lily',
    name: 'Lily',
    art: Lily,
    meaning: 'Quiet dignity, and respect that does not need saying.',
    defaultColor: '#fbf3e7',
    suggested: ['#fbf3e7', '#f0b27a', '#f3bccb', '#c4a7d8'],
  },
  daisy: {
    type: 'daisy',
    name: 'Daisy',
    art: Daisy,
    meaning: 'Cheerfulness kept simple, the way a child would draw it.',
    defaultColor: '#fbf3e7',
    suggested: ['#fbf3e7', '#f3bccb', '#8fb3d9', '#f4d58d'],
  },
  orchid: {
    type: 'orchid',
    name: 'Orchid',
    art: Orchid,
    meaning: 'Rare attention, for a rare person.',
    defaultColor: '#c4a7d8',
    suggested: ['#c4a7d8', '#9f7bc0', '#fbf3e7', '#f3bccb'],
  },
  dahlia: {
    type: 'dahlia',
    name: 'Dahlia',
    art: Dahlia,
    meaning: 'Standing out on purpose, and being glad about it.',
    defaultColor: '#9f7bc0',
    suggested: ['#9f7bc0', '#cf6382', '#e07a5f', '#f4d58d'],
  },
  anemone: {
    type: 'anemone',
    name: 'Anemone',
    art: Anemone,
    meaning: 'Anticipation: the held breath just before good news.',
    defaultColor: '#8fb3d9',
    suggested: ['#8fb3d9', '#fbf3e7', '#c4a7d8', '#cf6382'],
  },
  carnation: {
    type: 'carnation',
    name: 'Carnation',
    art: Carnation,
    meaning: 'Steady affection, the kind that remembers your birthday.',
    defaultColor: '#e4879f',
    suggested: ['#e4879f', '#cf6382', '#fbf3e7', '#f0b27a'],
  },
  zinnia: {
    type: 'zinnia',
    name: 'Zinnia',
    art: Zinnia,
    meaning: 'Thinking of a friend who lives too far away.',
    defaultColor: '#e07a5f',
    suggested: ['#e07a5f', '#e8b14a', '#cf6382', '#a8c8b4'],
  },
  ranunculus: {
    type: 'ranunculus',
    name: 'Ranunculus',
    art: Ranunculus,
    meaning: 'You are, frankly, dazzling.',
    defaultColor: '#f0b27a',
    suggested: ['#f0b27a', '#f3bccb', '#fbf3e7', '#cf6382'],
  },
};

/** Catalog order, used by the picker grid. */
export const FLOWER_LIST: readonly FlowerInfo[] = FLOWER_TYPES.map((type) => FLOWERS[type]);

export { default as Anemone } from './Anemone';
export { default as Carnation } from './Carnation';
export { default as Dahlia } from './Dahlia';
export { default as Daisy } from './Daisy';
export { default as Lily } from './Lily';
export { default as Orchid } from './Orchid';
export { default as Peony } from './Peony';
export { default as Ranunculus } from './Ranunculus';
export { default as Rose } from './Rose';
export { default as Sunflower } from './Sunflower';
export { default as Tulip } from './Tulip';
export { default as Zinnia } from './Zinnia';
export * from './flowerGeometry';
export * from './flowerKit';
