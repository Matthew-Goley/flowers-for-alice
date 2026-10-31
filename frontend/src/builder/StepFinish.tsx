/**
 * Step 4: put it on the home page.
 *
 * Posts the bouquet exactly once, with the create code, then sends the
 * builder home where the new bouquet is waiting. A rejected code drops the
 * remembered one so the next attempt asks again.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BouquetCanvas from '../components/BouquetCanvas';
import { Button, ButtonLink, Notice } from '../components/ui';
import { ApiError, createBouquet } from '../lib/api';
import { clearDraft } from '../lib/storage';
import { useArtColors } from '../lib/theme';
import { forgetCode, readCode } from '../lib/unlock';
import { toDesign, type BuilderState } from './builderState';

interface Props {
  state: BuilderState;
}

type Phase = 'sending' | 'failed' | 'refused';

export default function StepFinish({ state }: Props) {
  const { paper, ink } = useArtColors();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('sending');
  const [error, setError] = useState<string | null>(null);

  // Guards the effect below against StrictMode's double invocation, which
  // would otherwise save the bouquet twice.
  const submitted = useRef(false);

  const publish = useCallback(async () => {
    setPhase('sending');
    setError(null);

    const code = readCode();
    if (!code) {
      setPhase('refused');
      return;
    }

    try {
      await createBouquet(toDesign(state), code);
      clearDraft();
      void navigate('/', { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) {
        forgetCode();
        setPhase('refused');
        return;
      }
      setError(
        cause instanceof ApiError ? cause.message : 'Something went wrong saving your bouquet.',
      );
      setPhase('failed');
      submitted.current = false;
    }
  }, [state, navigate]);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    void publish();
  }, [publish]);

  return (
    <div className="grid gap-7 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-petal">
        <BouquetCanvas
          scene={state}
          paper={paper}
          ink={ink}
          className="aspect-square w-full"
          title="The finished bouquet"
        />
      </div>

      <div className="space-y-5">
        {phase === 'sending' && (
          <div className="flex items-center gap-3 text-ink-soft">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-accent"
              aria-hidden="true"
            />
            <p aria-live="polite">Tying the ribbon...</p>
          </div>
        )}

        {phase === 'failed' && (
          <div className="space-y-3">
            <Notice tone="error">{error}</Notice>
            <Button
              onClick={() => {
                submitted.current = true;
                void publish();
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {phase === 'refused' && (
          <div className="space-y-3">
            <Notice tone="error">
              The code was not accepted. Your bouquet is saved as a draft; enter the code again
              from the home page to finish it.
            </Notice>
            <ButtonLink to="/">Back to the home page</ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
