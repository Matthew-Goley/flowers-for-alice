/**
 * Step 4: share.
 *
 * Posts the bouquet once and keeps the returned id, so pressing the button
 * again does not litter the database with duplicates. From there: copy the
 * link, hand it to the native share sheet, or save a PNG.
 */

import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { Link } from 'react-router-dom';
import BouquetCanvas from '../components/BouquetCanvas';
import { Button, Notice } from '../components/ui';
import { APP_NAME } from '../config';
import { ApiError, createBouquet, shareUrl } from '../lib/api';
import { canNativeShare, copyText, downloadBouquetPng, nativeShare } from '../lib/download';
import { clearDraft } from '../lib/storage';
import { useArtColors } from '../lib/theme';
import { toDesign, type BuilderAction, type BuilderState } from './builderState';

interface Props {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
}

type Phase = 'idle' | 'sending' | 'done' | 'failed';

export default function StepShare({ state, dispatch }: Props) {
  const { paper, ink } = useArtColors();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [bouquetId, setBouquetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Guards the effect below against React 18 strict-mode double invocation,
  // which would otherwise create two bouquets for one visit.
  const submitted = useRef(false);

  const publish = useCallback(async () => {
    setPhase('sending');
    setError(null);
    try {
      const created = await createBouquet(toDesign(state));
      setBouquetId(created.id);
      setPhase('done');
      // The bouquet is safely on the server now; the draft has done its job.
      clearDraft();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : 'Something went wrong sending your bouquet.';
      setError(message);
      setPhase('failed');
      submitted.current = false;
    }
  }, [state]);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    void publish();
  }, [publish]);

  const url = bouquetId ? shareUrl(bouquetId) : '';

  const handleCopy = useCallback(async () => {
    if (!url) return;
    const ok = await copyText(url);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2400);
  }, [url]);

  const handleShare = useCallback(async () => {
    if (!url) return;
    const who = state.recipientName.trim();
    await nativeShare({
      title: `${APP_NAME}: a bouquet${who ? ` for ${who}` : ''}`,
      text: who ? `${who}, someone sent you flowers.` : 'Someone sent you flowers.',
      url,
    });
  }, [url, state.recipientName]);

  const handleDownload = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return;
    setSaving(true);
    try {
      await downloadBouquetPng(svg, {
        // Match the canvas's own ground so the caption strip and the
        // bouquet square are one colour rather than two.
        background: paper,
        ink,
        caption: {
          recipient: state.recipientName.trim() || undefined,
          sender: state.senderName.trim() || undefined,
          message: state.message.trim() || undefined,
        },
        filename: `${(state.recipientName.trim() || 'bouquet')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}-bouquet.png`,
      });
    } catch {
      setError('The image could not be saved. You can still share the link.');
    } finally {
      setSaving(false);
    }
  }, [paper, ink, state.recipientName, state.senderName, state.message]);

  return (
    <div className="grid gap-7 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-petal">
        <BouquetCanvas
          scene={state}
          paper={paper}
          ink={ink}
          svgRef={svgRef}
          className="aspect-square w-full"
          title="The bouquet you are about to send"
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

        {phase === 'done' && url && (
          <>
            <div>
              <h3 className="font-display text-3xl text-ink">It is ready to send.</h3>
              <p className="mt-1.5 text-ink-soft">
                {state.revealAt
                  ? 'The link works now, but the bouquet stays wrapped until the date you chose.'
                  : 'Anyone with this link can open it. No account needed.'}
              </p>
            </div>

            <div className="rounded-card border border-line bg-sunk p-4">
              <label
                htmlFor="share-link"
                className="mb-1.5 block text-xs font-bold tracking-[0.14em] text-ink-faint uppercase"
              >
                Your link
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="share-link"
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-2xl border border-line-strong bg-surface px-4 py-3 font-mono text-sm text-ink"
                />
                <Button onClick={() => void handleCopy()} className="shrink-0">
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-faint" aria-live="polite">
                {copied ? 'Link copied to your clipboard.' : ' '}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {canNativeShare() && (
                <Button variant="secondary" onClick={() => void handleShare()}>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2.6 7.4 7.2l1.6 1.6 2-2v9.4h2.2V6.8l2 2 1.6-1.6z" />
                    <path d="M5 11.2H3v8.6c0 1 .8 1.8 1.8 1.8h14.4c1 0 1.8-.8 1.8-1.8v-8.6h-2v8.2H5Z" />
                  </svg>
                  Share
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => void handleDownload()}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Download as PNG'}
              </Button>
              <Link
                to={`/b/${bouquetId}`}
                className="inline-flex items-center rounded-pill px-4 py-2.5 text-sm font-semibold text-ink-soft underline-offset-4 hover:text-accent-ink hover:underline"
              >
                See what they will see
              </Link>
            </div>

            {error && <Notice tone="error">{error}</Notice>}

            <div className="border-t border-line pt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  submitted.current = false;
                  setBouquetId(null);
                  setPhase('idle');
                  dispatch({ type: 'reset' });
                }}
              >
                Start another bouquet
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
