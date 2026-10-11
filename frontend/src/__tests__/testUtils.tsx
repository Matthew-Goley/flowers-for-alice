/**
 * A very small hook-testing harness.
 *
 * Testing Library is not a dependency of this project, and for the one hook
 * that needs driving (undo/redo) a dozen lines of React are enough. Renders a
 * component that does nothing but call the hook, and exposes its latest return
 * value plus a way to change the argument it is called with.
 *
 * Not a test file: vitest only collects `*.test.ts(x)`.
 */

import { act as reactAct, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** Run an update and flush React's work before returning. */
export function act(fn: () => void): void {
  reactAct(() => {
    fn();
  });
}

export interface HookHarness<A, R> {
  /** The hook's return value from the most recent render. */
  readonly result: R;
  /** The argument the hook was last called with. */
  readonly arg: A;
  setArg: (next: A) => void;
  unmount: () => void;
}

export function renderHook<A, R>(hook: (arg: A) => R, initialArg: A): HookHarness<A, R> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const harness = {
    result: undefined as unknown as R,
    arg: initialArg,
    setArg: (_next: A) => {},
    unmount: () => {},
  };

  function Harness(): ReactElement | null {
    const [value, setValue] = useState(initialArg);
    harness.arg = value;
    harness.setArg = (next: A) => act(() => setValue(next));
    harness.result = hook(value);
    return null;
  }

  reactAct(() => {
    root.render(<Harness />);
  });

  harness.unmount = () => {
    reactAct(() => root.unmount());
    container.remove();
  };

  return harness;
}
