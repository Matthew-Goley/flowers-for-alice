/**
 * Draft persistence.
 *
 * A half-built bouquet is real work, and people refresh. The whole builder
 * state is written to localStorage on every change (debounced by React's own
 * batching plus a short timer) and restored on mount.
 *
 * Restoring is defensive: the stored shape is whatever a previous version of
 * the app wrote, so anything unrecognised is discarded rather than trusted.
 */

import { STORAGE_KEYS } from '../config';
import { INITIAL_STATE, type BuilderState, type StepIndex } from '../builder/builderState';
import {
  isBouquetMode,
  isFlowerType,
  isGreeneryType,
  isWrapStyle,
  MAX_LETTER_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_NAME_CHARS,
  type FlowerPlacement,
} from '../types/bouquet';
import { isValidHex } from './color';

interface StoredDraft {
  version: 1;
  savedAt: string;
  state: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown, max: number, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseFlowers(value: unknown): FlowerPlacement[] {
  if (!Array.isArray(value)) return [];
  const out: FlowerPlacement[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const type = entry.type;
    const color = entry.color;
    if (typeof type !== 'string' || !isFlowerType(type)) continue;
    if (typeof color !== 'string' || !isValidHex(color)) continue;
    out.push({
      type,
      color,
      x: num(entry.x, 50),
      y: num(entry.y, 50),
      rotation: num(entry.rotation, 0),
      scale: num(entry.scale, 1),
    });
  }
  return out;
}

function parseCounts(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isFlowerType(key)) continue;
    const count = num(raw, 0);
    if (count > 0) out[key] = Math.min(50, Math.floor(count));
  }
  return out;
}

function parseColors(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (isFlowerType(key) && typeof raw === 'string' && isValidHex(raw)) out[key] = raw;
  }
  return out;
}

/** Rebuild a BuilderState from untrusted JSON, filling gaps with defaults. */
export function parseDraft(value: unknown): BuilderState | null {
  if (!isRecord(value)) return null;
  if (value.version !== 1 || !isRecord(value.state)) return null;

  const raw = value.state;
  const mode = typeof raw.mode === 'string' && isBouquetMode(raw.mode) ? raw.mode : 'bouquet';
  const greenery =
    typeof raw.greenery === 'string' && isGreeneryType(raw.greenery)
      ? raw.greenery
      : 'eucalyptus';
  const wrap = typeof raw.wrap === 'string' && isWrapStyle(raw.wrap) ? raw.wrap : 'kraft';
  const ribbon =
    typeof raw.ribbon === 'string' && isValidHex(raw.ribbon)
      ? raw.ribbon
      : INITIAL_STATE.ribbon;

  const step = Math.min(3, Math.max(0, Math.floor(num(raw.step, 0)))) as StepIndex;
  const revealAt = typeof raw.revealAt === 'string' && raw.revealAt ? raw.revealAt : null;

  return {
    // A restored draft never lands on the share step: that step posts to the
    // API, and replaying it would create a duplicate bouquet.
    step: step === 3 ? 2 : step,
    mode,
    counts: parseCounts(raw.counts),
    colors: parseColors(raw.colors),
    flowers: parseFlowers(raw.flowers),
    seed: num(raw.seed, 1),
    greenery,
    wrap,
    ribbon,
    mono: raw.mono === true,
    recipientName: str(raw.recipientName, MAX_NAME_CHARS),
    senderName: str(raw.senderName, MAX_NAME_CHARS),
    message: str(raw.message, MAX_MESSAGE_CHARS),
    letterText: str(raw.letterText, MAX_LETTER_CHARS),
    revealAt,
  };
}

export function loadDraft(): BuilderState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.draft);
    if (!raw) return null;
    return parseDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDraft(state: BuilderState): void {
  try {
    const payload: StoredDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(payload));
  } catch {
    // Quota or private mode. The builder still works, it just will not survive
    // a refresh, so there is nothing useful to tell the user here.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.draft);
  } catch {
    // Nothing to do.
  }
}

/** True when the draft holds enough work to be worth restoring. */
export function isDraftWorthKeeping(state: BuilderState): boolean {
  return (
    Object.keys(state.counts).length > 0 ||
    state.flowers.length > 0 ||
    state.letterText.trim().length > 0 ||
    state.message.trim().length > 0 ||
    state.recipientName.trim().length > 0
  );
}
