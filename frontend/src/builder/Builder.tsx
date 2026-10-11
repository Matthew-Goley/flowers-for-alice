/**
 * The four-step wizard.
 *
 * Owns the reducer, the draft persistence and the step chrome. The steps
 * themselves are presentational: they receive state and dispatch.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '../components/ui';
import { isDraftWorthKeeping, loadDraft, saveDraft } from '../lib/storage';
import {
  builderReducer,
  canAdvance,
  ensureArranged,
  INITIAL_STATE,
  maxReachableStep,
  STEPS,
  type BuilderState,
  type StepIndex,
} from './builderState';
import StepArrange from './StepArrange';
import StepFlowers from './StepFlowers';
import StepShare from './StepShare';
import StepWrap from './StepWrap';
import type { BouquetMode } from '../types/bouquet';

export interface BuilderProps {
  /**
   * Preloaded state, e.g. from an occasion preset. Overrides any saved draft.
   *
   * Callers that can switch between presets should pass a React `key` as well,
   * so swapping preset remounts the builder instead of merging a new preset
   * into half-finished work.
   */
  preset?: Partial<BuilderState>;
  /** Forces a mode on mount, used by /letters. */
  mode?: BouquetMode;
}

function initialise(
  preset: Partial<BuilderState> | undefined,
  mode?: BouquetMode,
): BuilderState {
  if (preset) {
    return ensureArranged({ ...INITIAL_STATE, ...preset, ...(mode ? { mode } : {}) });
  }
  const draft = loadDraft();
  if (draft && isDraftWorthKeeping(draft)) {
    return mode && draft.mode !== mode ? { ...INITIAL_STATE, mode } : draft;
  }
  return mode ? { ...INITIAL_STATE, mode } : INITIAL_STATE;
}

function StepDots({
  current,
  onJump,
  reachable,
}: {
  current: StepIndex;
  onJump: (step: StepIndex) => void;
  reachable: number;
}) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-3" aria-label="Progress">
      {STEPS.map((step, index) => {
        const state = index === current ? 'current' : index < current ? 'complete' : 'upcoming';
        const canJump = index <= reachable && index !== current;

        return (
          <li key={step.title} className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => canJump && onJump(index as StepIndex)}
              disabled={!canJump}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-pill px-2.5 py-1.5 text-sm transition-colors ${
                state === 'current'
                  ? 'bg-accent-wash font-bold text-accent-ink'
                  : state === 'complete'
                    ? 'font-semibold text-ink-soft hover:text-accent-ink'
                    : 'text-ink-faint'
              } ${canJump ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === 'upcoming'
                    ? 'bg-sunk text-ink-faint'
                    : 'bg-accent text-white dark:text-plum-900'
                }`}
              >
                {state === 'complete' ? (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M6.2 11.4 3 8.2l1.2-1.2 2 2 5-5L12.4 5z" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className={index === current ? 'inline' : 'hidden sm:inline'}>
                {step.short}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <span
                className={`hidden h-px w-4 sm:block lg:w-8 ${
                  index < current ? 'bg-accent' : 'bg-line-strong'
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Builder({ preset, mode }: BuilderProps) {
  const [state, dispatch] = useReducer(builderReducer, undefined, () =>
    initialise(preset, mode),
  );
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstRender = useRef(true);

  // Persist the draft. The share step clears it on success, so there is no
  // point writing while we are on it.
  useEffect(() => {
    if (state.step === 3) return;
    const timer = setTimeout(() => saveDraft(state), 350);
    return () => clearTimeout(timer);
  }, [state]);

  // Move focus to the step heading on navigation so a screen reader or
  // keyboard user lands in the new content instead of back at the top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.step]);

  // Which way the step panel slides. Held in state, not a ref, because the
  // render reads it to build the animation.
  const [direction, setDirection] = useState<1 | -1>(1);

  const goTo = useCallback(
    (step: StepIndex) => {
      setDirection(step >= state.step ? 1 : -1);
      dispatch({ type: 'goto', step });
    },
    [state.step],
  );

  const stepTitle = STEPS[state.step]?.title ?? '';

  const handleNext = () => {
    setDirection(1);
    dispatch({ type: 'next' });
  };
  const handleBack = () => {
    setDirection(-1);
    dispatch({ type: 'back' });
  };

  const slide = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 24 * direction },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 * direction },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="rounded-card border border-line bg-page p-4 shadow-petal-lg sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StepDots current={state.step} onJump={goTo} reachable={maxReachableStep(state)} />
        {state.step < 3 && (
          <div className="flex items-center gap-1 rounded-pill bg-sunk p-1">
            {(['bouquet', 'letters'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => dispatch({ type: 'setMode', mode: value })}
                aria-pressed={state.mode === value}
                className={`rounded-pill px-3 py-1.5 text-xs font-bold transition-colors ${
                  state.mode === value
                    ? 'bg-surface text-ink shadow-petal'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                {value === 'bouquet' ? 'Bouquet' : 'Letters'}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mb-5 font-display text-2xl text-ink focus:outline-none sm:text-3xl"
      >
        <span className="text-ink-faint">Step {state.step + 1}.</span> {stepTitle}
      </h2>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={state.step} {...slide}>
          {state.step === 0 && <StepFlowers state={state} dispatch={dispatch} />}
          {state.step === 1 && <StepArrange state={state} dispatch={dispatch} />}
          {state.step === 2 && <StepWrap state={state} dispatch={dispatch} />}
          {state.step === 3 && <StepShare state={state} dispatch={dispatch} />}
        </motion.div>
      </AnimatePresence>

      {state.step < 3 && (
        <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button variant="ghost" onClick={handleBack} disabled={state.step === 0}>
            Back
          </Button>

          <div className="flex items-center gap-3">
            {!canAdvance(state) && state.step === 0 && (
              <p className="hidden text-sm text-ink-faint sm:block">
                {state.mode === 'letters'
                  ? 'Type something to spell out.'
                  : 'Pick 6 to 10 flowers.'}
              </p>
            )}
            <Button size="lg" onClick={handleNext} disabled={!canAdvance(state)}>
              {state.step === 2 ? 'Make the link' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
