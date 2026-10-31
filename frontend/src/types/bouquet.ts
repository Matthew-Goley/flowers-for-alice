/**
 * The bouquet schema, shared by every part of the frontend.
 *
 * This is the TypeScript mirror of `backend/app/schemas.py` and
 * `backend/app/catalog.py`. If you add a flower, a wrap or a greenery style,
 * change it in all three places.
 */

export const FLOWER_TYPES = [
  'rose',
  'peony',
  'tulip',
  'sunflower',
  'lily',
  'daisy',
  'orchid',
  'dahlia',
  'anemone',
  'carnation',
  'zinnia',
  'ranunculus',
] as const;

export type FlowerType = (typeof FLOWER_TYPES)[number];

export const GREENERY_TYPES = ['none', 'eucalyptus', 'fern', 'babys-breath'] as const;
export type GreeneryType = (typeof GREENERY_TYPES)[number];

export const WRAP_STYLES = ['kraft', 'linen', 'lace', 'gingham', 'vellum'] as const;
export type WrapStyle = (typeof WRAP_STYLES)[number];

export const BOUQUET_MODES = ['bouquet', 'letters'] as const;
export type BouquetMode = (typeof BOUQUET_MODES)[number];

/** A hand bouquet holds 6 to 10 stems. Enforced on both sides of the wire. */
export const MIN_BOUQUET_FLOWERS = 6;
export const MAX_BOUQUET_FLOWERS = 10;
export const MAX_LETTER_FLOWERS = 600;

export const MAX_MESSAGE_CHARS = 300;
export const MAX_NAME_CHARS = 60;
export const MAX_LETTER_CHARS = 20;

/**
 * One bloom, positioned in the bouquet's 0-100 square coordinate space.
 * The canvas is always a square viewBox, so x and y are directly comparable.
 */
export interface FlowerPlacement {
  type: FlowerType;
  /** Hex colour, e.g. `#e4879f`. */
  color: string;
  x: number;
  y: number;
  /** Degrees. */
  rotation: number;
  /** 1 is the nominal bloom size. */
  scale: number;
}

/** Everything needed to draw a bouquet, before the server assigns it an id. */
export interface BouquetDesign {
  mode: BouquetMode;
  flowers: FlowerPlacement[];
  greenery: GreeneryType;
  wrap: WrapStyle;
  ribbon: string;
  /** Line-art rendering instead of filled colour. */
  mono: boolean;
  recipientName: string;
  senderName: string;
  message: string;
  /** Only used in `letters` mode. */
  letterText: string | null;
  /** ISO 8601, or null for "open immediately". */
  revealAt: string | null;
}

/** A bouquet fetched from the API and open for reading. */
export interface OpenBouquet extends BouquetDesign {
  id: string;
  createdAt: string;
  locked: false;
}

/**
 * A scheduled bouquet whose reveal date has not arrived. The server withholds
 * the flowers and the message, so this is deliberately not a `BouquetDesign`.
 */
export interface LockedBouquet {
  id: string;
  createdAt: string;
  locked: true;
  mode: BouquetMode;
  revealAt: string;
  wrap: WrapStyle;
  ribbon: string;
  recipientName: string;
  senderName: string;
}

export type SharedBouquet = OpenBouquet | LockedBouquet;

export interface CreatedBouquet {
  id: string;
}

// --------------------------------------------------------------------------
// wire format
// --------------------------------------------------------------------------

/**
 * The API speaks snake_case. These are the exact shapes that cross the wire;
 * `lib/api.ts` is the only module that should touch them.
 */
export interface WireFlower {
  type: FlowerType;
  color: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface WireDesign {
  mode: BouquetMode;
  flowers: WireFlower[];
  greenery: GreeneryType;
  wrap: WrapStyle;
  ribbon: string;
  mono: boolean;
  recipient_name: string;
  sender_name: string;
  message: string;
  letter_text?: string | null;
  reveal_at?: string | null;
}

export interface WireOpenBouquet extends WireDesign {
  id: string;
  created_at: string;
  locked: false;
}

export interface WireLockedBouquet {
  id: string;
  created_at: string;
  locked: true;
  mode: BouquetMode;
  reveal_at: string;
  wrap: WrapStyle;
  ribbon: string;
  recipient_name: string;
  sender_name: string;
}

export type WireBouquet = WireOpenBouquet | WireLockedBouquet;

export interface WireCreated {
  id: string;
}

// --------------------------------------------------------------------------
// helpers
// --------------------------------------------------------------------------

export function isFlowerType(value: string): value is FlowerType {
  return (FLOWER_TYPES as readonly string[]).includes(value);
}

export function isGreeneryType(value: string): value is GreeneryType {
  return (GREENERY_TYPES as readonly string[]).includes(value);
}

export function isWrapStyle(value: string): value is WrapStyle {
  return (WRAP_STYLES as readonly string[]).includes(value);
}

export function isBouquetMode(value: string): value is BouquetMode {
  return (BOUQUET_MODES as readonly string[]).includes(value);
}
