/**
 * The bottom-left menu on the home page.
 *
 * One entry for now, "Create a bouquet", which asks for the create code before
 * opening the builder. The code is checked by the server; once accepted it is
 * remembered for the session so the builder's final save can send it again.
 */

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ApiError, unlock } from '../lib/api';
import { readCode, rememberCode } from '../lib/unlock';
import { Button } from './ui';

type Panel = 'closed' | 'menu' | 'code';

export default function HomeMenu() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();
  const inputId = useId();

  const [panel, setPanel] = useState<Panel>('closed');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const close = useCallback(() => {
    setPanel('closed');
    setCode('');
    setError(null);
  }, []);

  // Escape and clicks outside both close the menu.
  useEffect(() => {
    if (panel === 'closed') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [panel, close]);

  const startCreate = () => {
    // Already unlocked this session: straight in.
    if (readCode()) {
      void navigate('/create');
      return;
    }
    setPanel('code');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const entered = code.trim();
    if (!entered || checking) return;

    setChecking(true);
    setError(null);
    try {
      await unlock(entered);
      rememberCode(entered);
      void navigate('/create');
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status !== 0
          ? cause.message
          : 'Could not check the code. Try again in a moment.',
      );
      setCode('');
      inputRef.current?.focus();
    } finally {
      setChecking(false);
    }
  };

  const pop = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 8, scale: 0.98 },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div
      ref={rootRef}
      className="fixed z-40 flex flex-col items-start gap-3"
      // Clear the iPhone home indicator and rounded corners: the page uses
      // viewport-fit=cover, so without this the button can sit under them.
      style={{
        bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
        left: 'max(1.25rem, env(safe-area-inset-left))',
      }}
    >
      <AnimatePresence mode="wait">
        {panel === 'menu' && (
          <motion.div
            key="menu"
            id={panelId}
            {...pop}
            className="min-w-52 origin-bottom-left rounded-2xl border border-line bg-surface p-1.5 shadow-petal-lg"
          >
            <button
              type="button"
              onClick={startCreate}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-sunk"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6z" />
              </svg>
              Create a bouquet
            </button>
          </motion.div>
        )}

        {panel === 'code' && (
          <motion.form
            key="code"
            id={panelId}
            {...pop}
            onSubmit={(event) => void submit(event)}
            className="w-64 origin-bottom-left rounded-2xl border border-line bg-surface p-4 shadow-petal-lg"
          >
            <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
              Enter the code
            </label>
            <input
              ref={inputRef}
              // Focus on mount, not from an effect on `panel`: the form only
              // mounts after the menu's exit animation, so an effect would run
              // before the input exists. (iOS opens the keyboard on tap only.)
              autoFocus
              id={inputId}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={64}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="mt-2 w-full rounded-xl border border-line-strong bg-page px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-ink focus:border-accent focus:outline-none"
            />
            <p
              id={`${inputId}-error`}
              className="mt-2 min-h-5 text-xs text-ink-soft"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
            <div className="mt-1 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!code.trim() || checking}>
                {checking ? 'Checking...' : 'Unlock'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => (panel === 'closed' ? setPanel('menu') : close())}
        aria-expanded={panel !== 'closed'}
        aria-controls={panel !== 'closed' ? panelId : undefined}
        aria-label={panel === 'closed' ? 'Open menu' : 'Close menu'}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-petal transition-colors hover:text-ink"
      >
        {panel === 'closed' ? (
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <rect x="3" y="5" width="14" height="1.8" rx="0.9" />
            <rect x="3" y="9.1" width="14" height="1.8" rx="0.9" />
            <rect x="3" y="13.2" width="14" height="1.8" rx="0.9" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="m5.3 4 4.7 4.7L14.7 4 16 5.3 11.3 10l4.7 4.7-1.3 1.3-4.7-4.7L5.3 16 4 14.7 8.7 10 4 5.3z" />
          </svg>
        )}
      </button>
    </div>
  );
}
