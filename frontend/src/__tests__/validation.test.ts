import { describe, expect, it } from 'vitest';
import {
  builderReducer,
  canAdvance,
  colorFor,
  flowerCountStatus,
  INITIAL_STATE,
  letterTextStatus,
  toDesign,
  totalFlowers,
  type BuilderState,
} from '../builder/builderState';
import {
  MAX_BOUQUET_FLOWERS,
  MAX_MESSAGE_CHARS,
  MIN_BOUQUET_FLOWERS,
  type FlowerType,
} from '../types/bouquet';

function withCounts(counts: Record<string, number>): BuilderState {
  return { ...INITIAL_STATE, counts };
}

function addMany(state: BuilderState, flower: FlowerType, times: number): BuilderState {
  let next = state;
  for (let i = 0; i < times; i += 1) {
    next = builderReducer(next, { type: 'addFlower', flower });
  }
  return next;
}

describe('flowerCountStatus', () => {
  it('counts across flower types', () => {
    expect(totalFlowers({ rose: 3, peony: 2 })).toBe(5);
    expect(totalFlowers({})).toBe(0);
  });

  it.each([0, 1, 5])('rejects %i flowers as too few', (count) => {
    const status = flowerCountStatus({ rose: count });
    expect(status.valid).toBe(false);
    expect(status.hint).toContain('Add');
  });

  it.each([6, 7, 8, 9, 10])('accepts %i flowers', (count) => {
    const status = flowerCountStatus({ rose: count });
    expect(status.valid).toBe(true);
    expect(status.hint).toBeNull();
  });

  it.each([11, 14])('rejects %i flowers as too many', (count) => {
    const status = flowerCountStatus({ rose: count });
    expect(status.valid).toBe(false);
    expect(status.hint).toContain('Remove');
  });

  it('reports the boundaries exactly', () => {
    expect(flowerCountStatus({ rose: MIN_BOUQUET_FLOWERS }).valid).toBe(true);
    expect(flowerCountStatus({ rose: MIN_BOUQUET_FLOWERS - 1 }).valid).toBe(false);
    expect(flowerCountStatus({ rose: MAX_BOUQUET_FLOWERS }).valid).toBe(true);
    expect(flowerCountStatus({ rose: MAX_BOUQUET_FLOWERS + 1 }).valid).toBe(false);
  });

  it('flags the maximum so the picker can disable Add', () => {
    expect(flowerCountStatus({ rose: 9 }).atMax).toBe(false);
    expect(flowerCountStatus({ rose: 10 }).atMax).toBe(true);
  });

  it('renders a live counter label', () => {
    expect(flowerCountStatus({ rose: 4 }).label).toBe('4 / 6-10 flowers');
  });

  it('uses singular wording for the last flower', () => {
    expect(flowerCountStatus({ rose: 5 }).hint).toBe('Add 1 more flower to continue.');
    expect(flowerCountStatus({ rose: 4 }).hint).toBe('Add 2 more flowers to continue.');
  });
});

describe('canAdvance', () => {
  it('blocks step 1 until the count is valid', () => {
    expect(canAdvance(withCounts({ rose: 5 }))).toBe(false);
    expect(canAdvance(withCounts({ rose: 6 }))).toBe(true);
    expect(canAdvance(withCounts({ rose: 11 }))).toBe(false);
  });

  it('blocks the arrange step until flowers are placed', () => {
    const state = { ...withCounts({ rose: 6 }), step: 1 as const };
    expect(canAdvance(state)).toBe(false);
    expect(
      canAdvance({
        ...state,
        flowers: [{ type: 'rose', color: '#fff', x: 1, y: 1, rotation: 0, scale: 1 }],
      }),
    ).toBe(true);
  });

  it('gates letter mode on the typed text instead of the count', () => {
    const base = { ...INITIAL_STATE, mode: 'letters' as const };
    expect(canAdvance({ ...base, letterText: '' })).toBe(false);
    expect(canAdvance({ ...base, letterText: 'HELLO' })).toBe(true);
  });

  it('does not advance past the last step', () => {
    expect(canAdvance({ ...withCounts({ rose: 6 }), step: 3 })).toBe(false);
  });
});

describe('letterTextStatus', () => {
  it('requires some text', () => {
    expect(letterTextStatus('').valid).toBe(false);
    expect(letterTextStatus('   ').valid).toBe(false);
  });

  it('accepts letters and spaces', () => {
    expect(letterTextStatus('BE KIND').valid).toBe(true);
    expect(letterTextStatus('mum').valid).toBe(true);
  });

  it('rejects digits, punctuation and emoji', () => {
    expect(letterTextStatus('H3LLO').valid).toBe(false);
    expect(letterTextStatus('hi!').valid).toBe(false);
    expect(letterTextStatus('hi \u{1f339}').valid).toBe(false);
  });

  it('rejects text over twenty characters', () => {
    expect(letterTextStatus('A'.repeat(20)).valid).toBe(true);
    expect(letterTextStatus('A'.repeat(21)).valid).toBe(false);
  });
});

describe('builderReducer: choosing flowers', () => {
  it('adds and removes a flower', () => {
    let state = builderReducer(INITIAL_STATE, { type: 'addFlower', flower: 'rose' });
    expect(state.counts.rose).toBe(1);

    state = builderReducer(state, { type: 'addFlower', flower: 'rose' });
    expect(state.counts.rose).toBe(2);

    state = builderReducer(state, { type: 'removeFlower', flower: 'rose' });
    expect(state.counts.rose).toBe(1);
  });

  it('drops the key entirely at zero', () => {
    let state = builderReducer(INITIAL_STATE, { type: 'addFlower', flower: 'rose' });
    state = builderReducer(state, { type: 'removeFlower', flower: 'rose' });
    expect('rose' in state.counts).toBe(false);
  });

  it('ignores a removal below zero', () => {
    const state = builderReducer(INITIAL_STATE, { type: 'removeFlower', flower: 'rose' });
    expect(state).toBe(INITIAL_STATE);
  });

  it('refuses to add past the maximum', () => {
    const full = addMany(INITIAL_STATE, 'rose', MAX_BOUQUET_FLOWERS);
    expect(totalFlowers(full.counts)).toBe(MAX_BOUQUET_FLOWERS);

    const overfull = builderReducer(full, { type: 'addFlower', flower: 'peony' });
    expect(totalFlowers(overfull.counts)).toBe(MAX_BOUQUET_FLOWERS);
    expect(overfull.counts.peony).toBeUndefined();
  });

  it('invalidates a stale arrangement when the tally changes', () => {
    let state = addMany(INITIAL_STATE, 'rose', 6);
    state = builderReducer(state, { type: 'next' });
    expect(state.step).toBe(1);
    expect(state.flowers.length).toBe(6);

    state = builderReducer(state, { type: 'addFlower', flower: 'daisy' });
    expect(state.flowers).toHaveLength(0);
  });
});

describe('builderReducer: arranging', () => {
  it('lays the bouquet out on entering step 2', () => {
    let state = addMany(INITIAL_STATE, 'tulip', 7);
    expect(state.flowers).toHaveLength(0);

    state = builderReducer(state, { type: 'next' });
    expect(state.step).toBe(1);
    expect(state.flowers).toHaveLength(7);
    expect(state.flowers.every((f) => f.type === 'tulip')).toBe(true);
  });

  it('will not advance from an invalid count', () => {
    const state = builderReducer(addMany(INITIAL_STATE, 'rose', 3), { type: 'next' });
    expect(state.step).toBe(0);
  });

  it('shuffle keeps the same blooms in different places', () => {
    let state = builderReducer(addMany(INITIAL_STATE, 'rose', 8), { type: 'next' });
    const before = state.flowers;
    state = builderReducer(state, { type: 'shuffle' });

    expect(state.flowers).toHaveLength(before.length);
    expect(state.flowers).not.toEqual(before);
  });

  it('dragging moves one bloom and keeps the rest', () => {
    let state = builderReducer(addMany(INITIAL_STATE, 'rose', 6), { type: 'next' });
    const original = state.flowers;
    state = builderReducer(state, { type: 'dragFlower', index: 1, x: 20, y: 30 });

    expect(state.flowers[1]?.x).toBe(20);
    expect(state.flowers[1]?.y).toBe(30);
    expect(state.flowers[0]).toEqual(original[0]);
  });

  it('recolouring keeps positions', () => {
    let state = builderReducer(addMany(INITIAL_STATE, 'rose', 6), { type: 'next' });
    const positions = state.flowers.map((f) => `${f.x},${f.y}`);

    state = builderReducer(state, { type: 'setColor', flower: 'rose', color: '#123456' });
    expect(state.flowers.map((f) => `${f.x},${f.y}`)).toEqual(positions);
    expect(state.flowers.every((f) => f.color === '#123456')).toBe(true);
  });
});

describe('builderReducer: text fields', () => {
  it('truncates the message at the limit', () => {
    const state = builderReducer(INITIAL_STATE, {
      type: 'setText',
      field: 'message',
      value: 'x'.repeat(400),
    });
    expect(state.message).toHaveLength(MAX_MESSAGE_CHARS);
  });

  it('truncates names at sixty characters', () => {
    const state = builderReducer(INITIAL_STATE, {
      type: 'setText',
      field: 'recipientName',
      value: 'y'.repeat(100),
    });
    expect(state.recipientName).toHaveLength(60);
  });

  it('truncates letter text at twenty characters', () => {
    const state = builderReducer(INITIAL_STATE, {
      type: 'setLetterText',
      value: 'z'.repeat(40),
    });
    expect(state.letterText).toHaveLength(20);
  });
});

describe('colorFor', () => {
  it('falls back to the catalog default', () => {
    expect(colorFor(INITIAL_STATE, 'sunflower')).toBe('#e8b14a');
  });

  it('prefers an explicit override', () => {
    const state = builderReducer(INITIAL_STATE, {
      type: 'setColor',
      flower: 'sunflower',
      color: '#abcdef',
    });
    expect(colorFor(state, 'sunflower')).toBe('#abcdef');
  });
});

describe('toDesign', () => {
  it('trims text and drops letter fields in bouquet mode', () => {
    let state = builderReducer(addMany(INITIAL_STATE, 'rose', 6), { type: 'next' });
    state = builderReducer(state, { type: 'setText', field: 'recipientName', value: '  Jo  ' });

    const design = toDesign(state);
    expect(design.recipientName).toBe('Jo');
    expect(design.letterText).toBeNull();
    expect(design.mode).toBe('bouquet');
  });

  it('upper-cases letter text and forces greenery off in letter mode', () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      mode: 'letters',
      letterText: 'be kind',
      greenery: 'fern',
    };
    const design = toDesign(state);
    expect(design.letterText).toBe('BE KIND');
    expect(design.greenery).toBe('none');
  });
});
