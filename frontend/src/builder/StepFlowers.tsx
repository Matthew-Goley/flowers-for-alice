/**
 * Step 1: choose flowers.
 *
 * A grid of cards. Tapping a card adds a stem; each card carries its own
 * quantity stepper once it has one. The live counter is the thing the whole
 * step hangs on, so it is announced to screen readers as it changes.
 */

import type { Dispatch } from 'react';
import { FLOWER_LIST, FlowerGlyph } from '../components/flowers';
import { PETAL_PALETTE } from '../config';
import { Notice, SwatchPicker } from '../components/ui';
import {
  colorFor,
  flowerCountStatus,
  letterTextStatus,
  type BuilderAction,
  type BuilderState,
} from './builderState';
import { MAX_LETTER_CHARS } from '../types/bouquet';
import { useArtColors } from '../lib/theme';

interface Props {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
}

export default function StepFlowers({ state, dispatch }: Props) {
  const { paper } = useArtColors();
  const status = flowerCountStatus(state.counts);
  const isLetters = state.mode === 'letters';
  const letterStatus = letterTextStatus(state.letterText);
  const chosen = FLOWER_LIST.filter((flower) => (state.counts[flower.type] ?? 0) > 0);

  return (
    <div className="space-y-6">
      {isLetters ? (
        <div className="rounded-card border border-line bg-sunk p-5">
          <label htmlFor="letter-text" className="mb-1.5 block text-sm font-semibold text-ink">
            What should it spell?
          </label>
          <input
            id="letter-text"
            value={state.letterText}
            onChange={(event) => dispatch({ type: 'setLetterText', value: event.target.value })}
            placeholder="MUM"
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_LETTER_CHARS}
            aria-describedby="letter-hint"
            className="w-full rounded-2xl border border-line-strong bg-page px-4 py-3 font-display text-2xl tracking-wide text-ink uppercase placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p id="letter-hint" className="text-xs text-ink-faint">
              {letterStatus.hint ?? 'Letters A to Z and spaces.'}
            </p>
            <p className="shrink-0 text-xs tabular-nums text-ink-faint">
              {state.letterText.length} / {MAX_LETTER_CHARS}
            </p>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Now pick the flowers the letters are made from. Choose as many kinds as you like.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p
              className={`font-display text-2xl ${status.valid ? 'text-ink' : 'text-ink-soft'}`}
              aria-live="polite"
            >
              {status.label}
            </p>
            <p className="mt-0.5 text-sm text-ink-faint">
              {status.hint ?? 'That is a proper bouquet. On to arranging.'}
            </p>
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-pill bg-sunk" role="presentation">
            <div
              className="h-full rounded-pill bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(100, (status.total / 10) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {status.atMax && !isLetters && (
        <Notice>
          Ten is the most a bouquet can hold. Remove one to swap in something else.
        </Notice>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {FLOWER_LIST.map((flower) => {
          const count = state.counts[flower.type] ?? 0;
          const color = colorFor(state, flower.type);
          const Art = flower.art;
          const blocked = !isLetters && status.atMax && count === 0;

          return (
            <li key={flower.type}>
              <div
                className={`group relative flex h-full flex-col rounded-card border bg-surface p-3 transition-all ${
                  count > 0
                    ? 'border-accent shadow-petal'
                    : 'border-line hover:border-line-strong hover:shadow-petal'
                }`}
              >
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'addFlower', flower: flower.type })}
                  disabled={blocked}
                  className="flex flex-1 flex-col items-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Add a ${flower.name}. ${flower.meaning} Currently ${count} in the bouquet.`}
                >
                  <FlowerGlyph className="h-20 w-20 motion-safe:transition-transform motion-safe:group-hover:scale-105">
                    <Art color={color} mono={state.mono} paper={paper} />
                  </FlowerGlyph>
                  <span className="mt-1 text-sm font-semibold text-ink">{flower.name}</span>
                </button>

                {count > 0 ? (
                  <div className="mt-2.5 flex items-center justify-between rounded-pill bg-sunk px-1 py-1">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'removeFlower', flower: flower.type })}
                      className="h-7 w-7 rounded-full text-lg leading-none font-bold text-ink-soft transition-colors hover:bg-surface hover:text-accent-ink"
                      aria-label={`Remove one ${flower.name}`}
                    >
                      &minus;
                    </button>
                    <span
                      className="text-sm font-bold tabular-nums text-ink"
                      aria-label={`${count} ${flower.name}`}
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'addFlower', flower: flower.type })}
                      disabled={!isLetters && status.atMax}
                      className="h-7 w-7 rounded-full text-lg leading-none font-bold text-ink-soft transition-colors hover:bg-surface hover:text-accent-ink disabled:opacity-35"
                      aria-label={`Add another ${flower.name}`}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <p className="mt-2.5 line-clamp-2 px-1 pb-1 text-center text-xs leading-snug text-ink-faint">
                    {flower.meaning}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {chosen.length > 0 && (
        <div className="space-y-5 rounded-card border border-line bg-sunk p-5">
          <h3 className="font-display text-lg text-ink">Colours</h3>
          {chosen.map((flower) => (
            <SwatchPicker
              key={flower.type}
              legend={flower.name}
              colors={PETAL_PALETTE}
              value={colorFor(state, flower.type)}
              onChange={(color) => dispatch({ type: 'setColor', flower: flower.type, color })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
