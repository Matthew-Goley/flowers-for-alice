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
  type BuilderAction,
  type BuilderState,
} from './builderState';
import type { FlowerType } from '../types/bouquet';
import { useArtColors } from '../lib/theme';

/** Personal notes under a few of the cards. Every other card has none. */
const CARD_NOTES: Partial<Record<FlowerType, string>> = {
  tulip: 'These are her favorite.',
  daisy: "Don't use these.",
};

interface Props {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
}

export default function StepFlowers({ state, dispatch }: Props) {
  const { paper } = useArtColors();
  const status = flowerCountStatus(state.counts);
  const chosen = FLOWER_LIST.filter((flower) => (state.counts[flower.type] ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`font-display text-2xl ${status.valid ? 'text-ink' : 'text-ink-soft'}`}
          aria-live="polite"
        >
          {status.label}
        </p>
        <div className="h-2 w-40 overflow-hidden rounded-pill bg-sunk" role="presentation">
          <div
            className="h-full rounded-pill bg-accent transition-[width] duration-300"
            style={{ width: `${Math.min(100, (status.total / 10) * 100)}%` }}
          />
        </div>
      </div>

      {status.atMax && (
        <Notice>
          Ten is the most a bouquet can hold. Remove one to swap in something else.
        </Notice>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {FLOWER_LIST.map((flower) => {
          const count = state.counts[flower.type] ?? 0;
          const color = colorFor(state, flower.type);
          const Art = flower.art;
          const blocked = status.atMax && count === 0;
          const note = CARD_NOTES[flower.type];

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
                  aria-label={`Add a ${flower.name}.${note ? ` ${note}` : ''} Currently ${count} in the bouquet.`}
                >
                  <FlowerGlyph className="h-20 w-20 motion-safe:transition-transform motion-safe:group-hover:scale-105">
                    <Art color={color} mono={false} paper={paper} />
                  </FlowerGlyph>
                  <span className="mt-1 text-sm font-semibold text-ink">{flower.name}</span>
                  {note && (
                    <span className="mt-0.5 text-center text-xs leading-snug text-ink-soft">
                      {note}
                    </span>
                  )}
                </button>

                {count > 0 && (
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
                      disabled={status.atMax}
                      className="h-7 w-7 rounded-full text-lg leading-none font-bold text-ink-soft transition-colors hover:bg-surface hover:text-accent-ink disabled:opacity-35"
                      aria-label={`Add another ${flower.name}`}
                    >
                      +
                    </button>
                  </div>
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
