/**
 * Step 3: wrap, ribbon and the note.
 *
 * The live preview sits beside the controls so every change is visible
 * immediately; on a phone it stacks above them.
 */

import type { Dispatch } from 'react';
import BouquetCanvas from '../components/BouquetCanvas';
import WrapPaper from '../components/wraps/WrapPaper';
import { WRAP_TONES } from '../components/wraps/wrapTokens';
import { SwatchPicker, TextArea, TextField } from '../components/ui';
import { RIBBON_PALETTE } from '../config';
import { useArtColors } from '../lib/theme';
import { MAX_MESSAGE_CHARS, MAX_NAME_CHARS, WRAP_STYLES } from '../types/bouquet';
import type { BuilderAction, BuilderState } from './builderState';

interface Props {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
}

export default function StepWrap({ state, dispatch }: Props) {
  const { paper, ink } = useArtColors();

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="lg:order-2 lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-petal">
          <BouquetCanvas
            scene={state}
            paper={paper}
            ink={ink}
            className="aspect-square w-full"
            title="Preview of your bouquet"
          />
        </div>
      </div>

      <div className="space-y-6 lg:order-1">
        <section className="rounded-card border border-line bg-sunk p-5">
          <h3 className="mb-3 font-display text-lg text-ink">Wrapping paper</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {WRAP_STYLES.map((style) => {
              const tone = WRAP_TONES[style];
              const selected = state.wrap === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => dispatch({ type: 'setWrap', wrap: style })}
                  aria-pressed={selected}
                  className={`flex flex-col items-center rounded-2xl border bg-surface p-2 transition-colors ${
                    selected
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-line hover:border-line-strong'
                  }`}
                >
                  <svg
                    viewBox="14 50 72 48"
                    className="h-14 w-full text-ink"
                    aria-hidden="true"
                  >
                    <WrapPaper style={style} mono={false} paper={paper} />
                  </svg>
                  <span className="mt-1 text-xs font-semibold text-ink">{tone.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <SwatchPicker
              legend="Ribbon"
              colors={RIBBON_PALETTE}
              value={state.ribbon}
              onChange={(ribbon) => dispatch({ type: 'setRibbon', ribbon })}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-card border border-line bg-sunk p-5">
          <h3 className="font-display text-lg text-ink">The note</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Who is it for?"
              placeholder="Alice <3"
              autoComplete="off"
              maxLength={MAX_NAME_CHARS}
              value={state.recipientName}
              onChange={(event) =>
                dispatch({ type: 'setText', field: 'recipientName', value: event.target.value })
              }
            />
            <TextField
              label="Who is it from?"
              placeholder="Your name"
              autoComplete="off"
              maxLength={MAX_NAME_CHARS}
              value={state.senderName}
              onChange={(event) =>
                dispatch({ type: 'setText', field: 'senderName', value: event.target.value })
              }
            />
          </div>

          <TextArea
            label="Message"
            placeholder="Say the thing you would write on the little card."
            maxLength={MAX_MESSAGE_CHARS}
            value={state.message}
            counter={{ value: state.message.length, max: MAX_MESSAGE_CHARS }}
            onChange={(event) =>
              dispatch({ type: 'setText', field: 'message', value: event.target.value })
            }
          />
        </section>
      </div>
    </div>
  );
}
