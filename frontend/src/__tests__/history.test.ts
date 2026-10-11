/**
 * Undo/redo semantics.
 *
 * The hook does not own the value it tracks, so these tests drive it the way
 * the arrange step does: hold the live value here, call `record` with the
 * value as it was before a change, then apply whatever undo/redo returns.
 *
 * The redo case is the one worth guarding. An earlier version of the hook kept
 * its own copy of the present, which drifted from the reducer as soon as an
 * action computed a value the hook had not been shown, and redo then replayed
 * the state it had just undone.
 */

import { act, renderHook } from './testUtils';
import { describe, expect, it } from 'vitest';
import { useHistory } from '../lib/useHistory';

/** A tiny stand-in for the arrange step: live value plus the hook. */
function setup(initial: string) {
  const harness = renderHook((current: string) => useHistory(current), initial);

  return {
    get value() {
      return harness.arg;
    },
    get history() {
      return harness.result;
    },
    /** Apply a change the way a gesture would: record, then move on. */
    change(next: string) {
      act(() => harness.result.record(harness.arg));
      harness.setArg(next);
    },
    undo() {
      const target = harness.result.undo();
      if (target !== null) harness.setArg(target);
      return target;
    },
    redo() {
      const target = harness.result.redo();
      if (target !== null) harness.setArg(target);
      return target;
    },
  };
}

describe('useHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const h = setup('a');
    expect(h.history.canUndo).toBe(false);
    expect(h.history.canRedo).toBe(false);
    expect(h.history.depth).toBe(0);
  });

  it('enables undo once a change is recorded', () => {
    const h = setup('a');
    h.change('b');
    expect(h.history.canUndo).toBe(true);
    expect(h.history.canRedo).toBe(false);
  });

  it('undo returns the previous value', () => {
    const h = setup('a');
    h.change('b');
    expect(h.undo()).toBe('a');
    expect(h.value).toBe('a');
  });

  it('redo returns the value undo stepped away from', () => {
    const h = setup('a');
    h.change('b');
    h.undo();

    expect(h.history.canRedo).toBe(true);
    expect(h.redo()).toBe('b');
    expect(h.value).toBe('b');
  });

  it('walks a longer chain in both directions', () => {
    const h = setup('a');
    h.change('b');
    h.change('c');
    h.change('d');

    expect(h.undo()).toBe('c');
    expect(h.undo()).toBe('b');
    expect(h.undo()).toBe('a');
    expect(h.history.canUndo).toBe(false);

    expect(h.redo()).toBe('b');
    expect(h.redo()).toBe('c');
    expect(h.redo()).toBe('d');
    expect(h.history.canRedo).toBe(false);
  });

  it('returns null at either end rather than throwing', () => {
    const h = setup('a');
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });

  it('a new change after an undo drops the redo branch', () => {
    const h = setup('a');
    h.change('b');
    h.undo();
    expect(h.history.canRedo).toBe(true);

    h.change('z');
    expect(h.history.canRedo).toBe(false);
    expect(h.undo()).toBe('a');
  });

  it('reset clears both stacks', () => {
    const h = setup('a');
    h.change('b');
    h.change('c');

    act(() => h.history.reset());
    expect(h.history.canUndo).toBe(false);
    expect(h.history.canRedo).toBe(false);
    expect(h.history.depth).toBe(0);
  });

  it('caps how far back it remembers', () => {
    const h = setup('v0');
    for (let i = 1; i <= 60; i += 1) h.change(`v${i}`);
    expect(h.history.depth).toBeLessThanOrEqual(40);
    expect(h.history.canUndo).toBe(true);
  });
});
