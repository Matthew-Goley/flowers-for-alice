/**
 * Undo/redo over a value that somebody else owns.
 *
 * The flower list lives in the builder's reducer, not in here, so this hook
 * does not try to be the source of truth. It keeps two stacks of snapshots and
 * is told the live value on every render; `record` is called with the value as
 * it was *before* a change, and `undo`/`redo` return the value to apply.
 *
 * Getting that split right is what makes redo work. An earlier version stored
 * its own "present" and went out of step with the reducer the moment an action
 * computed a new value the hook had not seen, which left redo replaying the
 * state it had just undone.
 *
 * `record` is called once per completed gesture. Dragging a flower fires dozens
 * of updates a second, so the component drags freely and records the starting
 * position on pointer up; otherwise undo would step back one pixel at a time.
 */

import { useCallback, useEffect, useState } from 'react';

const MAX_HISTORY = 40;

export interface History<T> {
  canUndo: boolean;
  canRedo: boolean;
  /** Remember `before` as a point undo can return to. Clears the redo stack. */
  record: (before: T) => void;
  /** Step back, returning the value to apply, or null at the beginning. */
  undo: () => T | null;
  redo: () => T | null;
  /** Forget everything. */
  reset: () => void;
  depth: number;
}

/** @param current the live value, owned by the caller. */
export function useHistory<T>(current: T): History<T> {
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const record = useCallback((before: T) => {
    setPast((stack) => [...stack, before].slice(-MAX_HISTORY));
    // A fresh action invalidates anything that was redoable.
    setFuture([]);
  }, []);

  const undo = useCallback((): T | null => {
    const previous = past.at(-1);
    if (previous === undefined) return null;
    setPast((stack) => stack.slice(0, -1));
    setFuture((stack) => [current, ...stack]);
    return previous;
  }, [past, current]);

  const redo = useCallback((): T | null => {
    const next = future[0];
    if (next === undefined) return null;
    setFuture((stack) => stack.slice(1));
    setPast((stack) => [...stack, current]);
    return next;
  }, [future, current]);

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    record,
    undo,
    redo,
    reset,
    depth: past.length,
  };
}

/**
 * Wire Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) to undo and redo.
 *
 * Ignores the shortcuts while a text field has focus, so typing a message and
 * undoing a word still behaves the way the browser does.
 */
export function useUndoShortcuts(onUndo: () => void, onRedo: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) onRedo();
        else onUndo();
      } else if (key === 'y') {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo, enabled]);
}
