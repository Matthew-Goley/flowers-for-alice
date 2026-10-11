/**
 * Product-level constants.
 *
 * The name, tagline and domain come from /brand.json at the repo root (the one
 * place to edit for a rename); the backend reads the same file. Everything else
 * here is UI configuration that has no business being scattered through
 * components.
 */

export const APP_NAME = __BRAND__.name;
export const TAGLINE = __BRAND__.tagline;
export const DOMAIN = __BRAND__.domain;
export const SUPPORT_EMAIL = __BRAND__.supportEmail;

/** Storage keys. Bump the suffix if a shape change would break old drafts. */
export const STORAGE_KEYS = {
  draft: 'petalpost:draft:v1',
  theme: 'petalpost:theme',
  music: 'petalpost:music',
} as const;

/** Petal colours offered in the builder. Hand-picked to look good together. */
export const PETAL_PALETTE = [
  { name: 'Blush', value: '#f3bccb' },
  { name: 'Rose', value: '#e4879f' },
  { name: 'Raspberry', value: '#cf6382' },
  { name: 'Poppy', value: '#e07a5f' },
  { name: 'Apricot', value: '#f0b27a' },
  { name: 'Butter', value: '#f4d58d' },
  { name: 'Sunbeam', value: '#e8b14a' },
  { name: 'Lilac', value: '#c4a7d8' },
  { name: 'Violet', value: '#9f7bc0' },
  { name: 'Cornflower', value: '#8fb3d9' },
  { name: 'Mint', value: '#a8c8b4' },
  { name: 'Cream', value: '#fbf3e7' },
] as const;

/** Ribbon colours. Deliberately a shorter, calmer list than the petals. */
export const RIBBON_PALETTE = [
  { name: 'Blush', value: '#e4a0b7' },
  { name: 'Raspberry', value: '#cf6382' },
  { name: 'Sage', value: '#7d9c70' },
  { name: 'Gold', value: '#e8b14a' },
  { name: 'Dove', value: '#cdc3bb' },
  { name: 'Ink', value: '#4a3b43' },
] as const;

export const DEFAULT_RIBBON = RIBBON_PALETTE[0].value;
