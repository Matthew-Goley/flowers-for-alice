/**
 * Builder state: the reducer behind the four-step wizard.
 *
 * Step 1 tracks a tally of flower types (how many roses, how many peonies).
 * Step 2 turns that tally into positioned blooms. From then on the positions
 * are authoritative, because the user can drag them; re-entering step 1 and
 * changing the tally re-arranges from scratch.
 */

import {
  MAX_BOUQUET_FLOWERS,
  MAX_LETTER_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_NAME_CHARS,
  MIN_BOUQUET_FLOWERS,
  type BouquetDesign,
  type BouquetMode,
  type FlowerPlacement,
  type FlowerType,
  type GreeneryType,
  type WrapStyle,
} from '../types/bouquet';
import { DEFAULT_RIBBON } from '../config';
import { FLOWERS } from '../components/flowers';
import { arrangeBouquet, moveFlower, reshuffle, stemsFromCounts } from '../lib/arrange';
import { buildLetterBouquet } from '../lib/letters';
import { newSeed } from '../lib/random';

export const STEP_COUNT = 4;
export type StepIndex = 0 | 1 | 2 | 3;

export const STEPS: readonly { title: string; short: string }[] = [
  { title: 'Choose flowers', short: 'Flowers' },
  { title: 'Arrange', short: 'Arrange' },
  { title: 'Wrap and message', short: 'Wrap' },
  { title: 'Share', short: 'Share' },
];

export interface BuilderState {
  step: StepIndex;
  mode: BouquetMode;
  /** Step 1 tally. Insertion order is the order they were added. */
  counts: Record<string, number>;
  /** Per-type colour overrides; falls back to the flower's default. */
  colors: Record<string, string>;
  /** Positioned blooms. Empty until step 2 arranges them. */
  flowers: FlowerPlacement[];
  /** Seed of the current arrangement, so a reload reproduces it exactly. */
  seed: number;
  greenery: GreeneryType;
  wrap: WrapStyle;
  ribbon: string;
  mono: boolean;
  recipientName: string;
  senderName: string;
  message: string;
  letterText: string;
  revealAt: string | null;
}

export const INITIAL_STATE: BuilderState = {
  step: 0,
  mode: 'bouquet',
  counts: {},
  colors: {},
  flowers: [],
  seed: 1,
  greenery: 'eucalyptus',
  wrap: 'kraft',
  ribbon: DEFAULT_RIBBON,
  mono: false,
  recipientName: '',
  senderName: '',
  message: '',
  letterText: '',
  revealAt: null,
};

// --------------------------------------------------------------------------
// derived values and validation
// --------------------------------------------------------------------------

export function totalFlowers(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

export interface CountStatus {
  total: number;
  valid: boolean;
  /** True once another bloom would exceed the maximum. */
  atMax: boolean;
  /** Short status line shown under the picker. */
  label: string;
  /** Why Next is disabled, or null when it is not. */
  hint: string | null;
}

/**
 * The rule the whole of step 1 hangs on: a bouquet is 6 to 10 stems.
 *
 * Returned as a value rather than a boolean so the counter, the Next button
 * and the screen-reader announcement all read from one source.
 */
export function flowerCountStatus(counts: Record<string, number>): CountStatus {
  const total = totalFlowers(counts);
  const valid = total >= MIN_BOUQUET_FLOWERS && total <= MAX_BOUQUET_FLOWERS;
  const atMax = total >= MAX_BOUQUET_FLOWERS;

  let hint: string | null = null;
  if (total < MIN_BOUQUET_FLOWERS) {
    const needed = MIN_BOUQUET_FLOWERS - total;
    hint = `Add ${needed} more ${needed === 1 ? 'flower' : 'flowers'} to continue.`;
  } else if (total > MAX_BOUQUET_FLOWERS) {
    hint = `Remove ${total - MAX_BOUQUET_FLOWERS} to get back to ${MAX_BOUQUET_FLOWERS}.`;
  }

  return {
    total,
    valid,
    atMax,
    label: `${total} / ${MIN_BOUQUET_FLOWERS}-${MAX_BOUQUET_FLOWERS} flowers`,
    hint,
  };
}

export function letterTextStatus(text: string): { valid: boolean; hint: string | null } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, hint: 'Type a name or a short word to spell out.' };
  }
  if (trimmed.length > MAX_LETTER_CHARS) {
    return { valid: false, hint: `Keep it to ${MAX_LETTER_CHARS} characters or fewer.` };
  }
  if (!/^[A-Za-z ]+$/.test(trimmed)) {
    return { valid: false, hint: 'Letters A to Z and spaces only.' };
  }
  return { valid: true, hint: null };
}

/** Whether the user may advance from `step`. */
export function canAdvance(state: BuilderState, step: StepIndex = state.step): boolean {
  if (state.mode === 'letters') {
    if (step === 0) return letterTextStatus(state.letterText).valid;
    return step < STEP_COUNT - 1;
  }
  if (step === 0) return flowerCountStatus(state.counts).valid;
  if (step === 1) return state.flowers.length > 0;
  return step < STEP_COUNT - 1;
}

/**
 * The furthest step the progress dots may jump to.
 *
 * Derived from the state rather than remembered as "furthest visited", which
 * means a step stops being reachable the moment its prerequisite breaks. The
 * share step is never jumpable: reaching it publishes the bouquet, so it has
 * to go through the Next button.
 */
export function maxReachableStep(state: BuilderState): number {
  if (!canAdvance(state, 0)) return 0;
  if (state.flowers.length === 0) return 1;
  return 2;
}

export function colorFor(state: BuilderState, type: FlowerType): string {
  return state.colors[type] ?? FLOWERS[type].defaultColor;
}

// --------------------------------------------------------------------------
// actions
// --------------------------------------------------------------------------

export type BuilderAction =
  | { type: 'goto'; step: StepIndex }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'setMode'; mode: BouquetMode }
  | { type: 'addFlower'; flower: FlowerType }
  | { type: 'removeFlower'; flower: FlowerType }
  | { type: 'setColor'; flower: FlowerType; color: string }
  | { type: 'setFlowers'; flowers: FlowerPlacement[] }
  | { type: 'shuffle' }
  | { type: 'dragFlower'; index: number; x: number; y: number }
  | { type: 'setGreenery'; greenery: GreeneryType }
  | { type: 'setWrap'; wrap: WrapStyle }
  | { type: 'setRibbon'; ribbon: string }
  | { type: 'setMono'; mono: boolean }
  | { type: 'setText'; field: 'recipientName' | 'senderName' | 'message'; value: string }
  | { type: 'setLetterText'; value: string }
  | { type: 'setRevealAt'; value: string | null }
  | { type: 'preset'; preset: Partial<BuilderState> }
  | { type: 'restore'; state: BuilderState }
  | { type: 'reset' };

/** Rebuild the arrangement from the current tally or letter text. */
function rearrange(state: BuilderState, seed: number): FlowerPlacement[] {
  if (state.mode === 'letters') {
    const status = letterTextStatus(state.letterText);
    if (!status.valid) return [];
    const types = Object.keys(state.counts).filter(
      (key): key is FlowerType => (state.counts[key] ?? 0) > 0,
    );
    const chosen = types.length > 0 ? types : (['daisy'] as FlowerType[]);
    return buildLetterBouquet({
      text: state.letterText,
      palette: chosen.map((type) => colorFor(state, type)),
      types: chosen,
      seed,
    });
  }

  const counts = new Map<FlowerType, number>();
  for (const [key, value] of Object.entries(state.counts)) {
    if (value > 0) counts.set(key as FlowerType, value);
  }
  return arrangeBouquet(
    stemsFromCounts(counts, (type) => colorFor(state, type)),
    seed,
  );
}

function clampStep(step: number): StepIndex {
  return Math.min(STEP_COUNT - 1, Math.max(0, step)) as StepIndex;
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'goto':
      return { ...state, step: clampStep(action.step) };

    case 'next': {
      if (!canAdvance(state)) return state;
      const step = clampStep(state.step + 1);
      // Entering the arrange step for the first time lays the bouquet out.
      if (step === 1 && state.flowers.length === 0) {
        const seed = newSeed();
        return { ...state, step, seed, flowers: rearrange(state, seed) };
      }
      return { ...state, step };
    }

    case 'back':
      return { ...state, step: clampStep(state.step - 1) };

    case 'setMode': {
      if (action.mode === state.mode) return state;
      const next = { ...state, mode: action.mode, step: 0 as StepIndex, flowers: [] };
      return next;
    }

    case 'addFlower': {
      const current = state.counts[action.flower] ?? 0;
      if (state.mode === 'bouquet' && totalFlowers(state.counts) >= MAX_BOUQUET_FLOWERS) {
        return state;
      }
      const counts = { ...state.counts, [action.flower]: current + 1 };
      // The tally changed, so any existing arrangement is stale.
      return { ...state, counts, flowers: [] };
    }

    case 'removeFlower': {
      const current = state.counts[action.flower] ?? 0;
      if (current <= 0) return state;
      const counts = { ...state.counts };
      if (current === 1) {
        delete counts[action.flower];
      } else {
        counts[action.flower] = current - 1;
      }
      return { ...state, counts, flowers: [] };
    }

    case 'setColor': {
      const colors = { ...state.colors, [action.flower]: action.color };
      const next = { ...state, colors };
      // Recolour in place: positions are preserved, only the hex changes.
      return {
        ...next,
        flowers: state.flowers.map((flower) =>
          flower.type === action.flower ? { ...flower, color: action.color } : flower,
        ),
      };
    }

    case 'setFlowers':
      return { ...state, flowers: action.flowers };

    case 'shuffle': {
      const seed = newSeed();
      const flowers =
        state.mode === 'letters' ? rearrange(state, seed) : reshuffle(state.flowers, seed);
      return { ...state, seed, flowers };
    }

    case 'dragFlower':
      return { ...state, flowers: moveFlower(state.flowers, action.index, action.x, action.y) };

    case 'setGreenery':
      return { ...state, greenery: action.greenery };

    case 'setWrap':
      return { ...state, wrap: action.wrap };

    case 'setRibbon':
      return { ...state, ribbon: action.ribbon };

    case 'setMono':
      return { ...state, mono: action.mono };

    case 'setText':
      return {
        ...state,
        [action.field]: action.value.slice(
          0,
          action.field === 'message' ? MAX_MESSAGE_CHARS : MAX_NAME_CHARS,
        ),
      };

    case 'setLetterText': {
      const letterText = action.value.slice(0, MAX_LETTER_CHARS);
      return { ...state, letterText, flowers: [] };
    }

    case 'setRevealAt':
      return { ...state, revealAt: action.value };

    case 'preset': {
      const merged = { ...state, ...action.preset, step: 0 as StepIndex, flowers: [] };
      return merged;
    }

    case 'restore':
      return action.state;

    case 'reset':
      return { ...INITIAL_STATE, seed: newSeed() };

    default:
      return state;
  }
}

/** Build the arrangement for a state that has none yet (used by presets). */
export function ensureArranged(state: BuilderState): BuilderState {
  if (state.flowers.length > 0) return state;
  const seed = state.seed || newSeed();
  return { ...state, seed, flowers: rearrange(state, seed) };
}

/** Convert builder state into the payload the API accepts. */
export function toDesign(state: BuilderState): BouquetDesign {
  return {
    mode: state.mode,
    flowers: state.flowers,
    greenery: state.mode === 'letters' ? 'none' : state.greenery,
    wrap: state.wrap,
    ribbon: state.ribbon,
    mono: state.mono,
    recipientName: state.recipientName.trim(),
    senderName: state.senderName.trim(),
    message: state.message.trim(),
    letterText: state.mode === 'letters' ? state.letterText.trim().toUpperCase() : null,
    revealAt: state.revealAt,
  };
}
