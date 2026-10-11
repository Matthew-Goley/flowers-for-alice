/**
 * /b/:id - what the recipient sees.
 *
 * Deliberately not the rest of the site: no header, no nav, nothing to click
 * except the parcel. The sequence is wrapped parcel, tap, flowers in one by
 * one, then the card.
 *
 * A scheduled bouquet never reaches this page with its contents: the server
 * withholds the flowers and the message until the reveal date, so the
 * countdown is real rather than a client-side curtain.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import BouquetCanvas, { type BouquetScene } from '../components/BouquetCanvas';
import MusicToggle from '../components/MusicToggle';
import { Button, ButtonLink } from '../components/ui';
import { APP_NAME } from '../config';
import { ApiError, fetchBouquet } from '../lib/api';
import { canNativeShare, downloadBouquetPng } from '../lib/download';
import { useArtColors } from '../lib/theme';
import type { SharedBouquet } from '../types/bouquet';
import Countdown from '../components/Countdown';

type Status = 'loading' | 'ready' | 'missing' | 'error';

/** Milliseconds between blooms during the reveal. */
const BLOOM_INTERVAL = 220;

/**
 * Keyed on the id so that navigating between two bouquets remounts the view.
 * Without this the inner component would have to reset six pieces of state
 * from an effect, which is both fiddly and a cascading render.
 */
export default function Recipient() {
  const { id = '' } = useParams<{ id: string }>();
  return <RecipientView key={id} id={id} />;
}

function RecipientView({ id }: { id: string }) {
  const { paper, ink } = useArtColors();
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [status, setStatus] = useState<Status>('loading');
  const [bouquet, setBouquet] = useState<SharedBouquet | null>(null);
  const [message, setMessage] = useState<string>('');
  const [opened, setOpened] = useState(false);
  const [visible, setVisible] = useState(0);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchBouquet(id, controller.signal)
      .then((result) => {
        setBouquet(result);
        setStatus('ready');
        document.title = result.recipientName
          ? `Flowers for ${result.recipientName} | ${APP_NAME}`
          : `Someone sent you flowers | ${APP_NAME}`;
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setStatus('missing');
          return;
        }
        setMessage(
          cause instanceof ApiError ? cause.message : 'We could not load this bouquet.',
        );
        setStatus('error');
      });

    return () => controller.abort();
  }, [id]);

  const open = useCallback(() => {
    if (opened || !bouquet || bouquet.locked) return;
    setOpened(true);

    if (reduceMotion) {
      setVisible(bouquet.flowers.length);
      setShowCard(true);
      return;
    }

    // Blooms appear one at a time, then the card follows.
    let shown = 0;
    const total = bouquet.flowers.length;
    const timer = setInterval(() => {
      shown += 1;
      setVisible(shown);
      if (shown >= total) {
        clearInterval(timer);
        setTimeout(() => setShowCard(true), 420);
      }
    }, BLOOM_INTERVAL);
  }, [opened, bouquet, reduceMotion]);

  const handleDownload = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg || !bouquet || bouquet.locked) return;
    await downloadBouquetPng(svg, {
      // Match the canvas's own ground so the caption strip and the
      // bouquet square are one colour rather than two.
      background: paper,
      ink,
      caption: {
        recipient: bouquet.recipientName || undefined,
        sender: bouquet.senderName || undefined,
        message: bouquet.message || undefined,
      },
      filename: 'bouquet.png',
    });
  }, [bouquet, paper, ink]);

  if (status === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 text-ink-soft">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-accent"
            aria-hidden="true"
          />
          <p>Fetching your flowers...</p>
        </div>
      </Shell>
    );
  }

  if (status === 'missing' || status === 'error') {
    return (
      <Shell>
        <div className="max-w-md text-center">
          <h1 className="font-display text-4xl text-ink">
            {status === 'missing' ? 'Nothing here' : 'Something went wrong'}
          </h1>
          <p className="mt-3 text-ink-soft">
            {status === 'missing'
              ? 'This bouquet has wilted, or the link has a typo in it. Check the address and try again.'
              : message}
          </p>
          <ButtonLink to="/" className="mt-7" size="lg">
            Make a bouquet instead
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  if (!bouquet) return null;

  // Sealed: the server has not released the contents yet.
  if (bouquet.locked) {
    const scene: BouquetScene = {
      mode: bouquet.mode,
      flowers: [],
      greenery: 'none',
      wrap: bouquet.wrap,
      ribbon: bouquet.ribbon,
      mono: false,
    };

    return (
      <Shell>
        <div className="w-full max-w-md text-center">
          {bouquet.recipientName && (
            <p className="font-display text-2xl text-ink-soft">For {bouquet.recipientName}</p>
          )}
          <div className="mx-auto mt-4 w-full max-w-xs overflow-hidden rounded-card border border-line bg-surface shadow-petal-lg">
            <BouquetCanvas
              scene={scene}
              paper={paper}
              ink={ink}
              sealed
              className="aspect-square w-full"
              title="A wrapped bouquet, not yet open"
            />
          </div>

          <h1 className="mt-7 font-display text-3xl text-ink">Not just yet.</h1>
          <p className="mt-2 text-ink-soft">
            {bouquet.senderName
              ? `${bouquet.senderName} wrapped this one up for later.`
              : 'Someone wrapped this one up for later.'}
          </p>

          <Countdown target={bouquet.revealAt} className="mt-6" />

          <p className="mt-6 text-sm text-ink-faint">
            Come back then and the paper will come off.
          </p>
          <ButtonLink to="/" variant="secondary" className="mt-6">
            Make one of your own
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  const scene: BouquetScene = {
    mode: bouquet.mode,
    flowers: bouquet.flowers,
    greenery: bouquet.greenery,
    wrap: bouquet.wrap,
    ribbon: bouquet.ribbon,
    mono: bouquet.mono,
  };

  return (
    <Shell>
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {!opened ? (
            <motion.div
              key="sealed"
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              className="text-center"
            >
              {bouquet.recipientName && (
                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-2xl text-ink-soft"
                >
                  For {bouquet.recipientName}
                </motion.p>
              )}

              <motion.button
                type="button"
                onClick={open}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: [0, -8, 0] }}
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: { duration: 0.5 },
                        y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                      }
                }
                className="mx-auto mt-5 block w-full max-w-xs rounded-card border border-line bg-surface p-2 shadow-petal-lg transition-shadow hover:shadow-petal"
                aria-label="Open your bouquet"
              >
                <BouquetCanvas
                  scene={scene}
                  paper={paper}
                  ink={ink}
                  sealed
                  className="aspect-square w-full"
                  title="A wrapped bouquet. Tap to open it."
                />
              </motion.button>

              <motion.p
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-7 font-display text-3xl text-ink"
              >
                Someone sent you flowers.
              </motion.p>
              <p className="mt-2 text-ink-soft">Tap the parcel to unwrap it.</p>
              <Button onClick={open} size="lg" className="mt-5">
                Open it
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="overflow-hidden rounded-card border border-line bg-surface shadow-petal-lg">
                <BouquetCanvas
                  scene={scene}
                  paper={paper}
                  ink={ink}
                  visibleCount={visible}
                  svgRef={svgRef}
                  className="aspect-square w-full"
                  title={
                    bouquet.recipientName
                      ? `A bouquet for ${bouquet.recipientName}`
                      : 'A bouquet for you'
                  }
                />
              </div>

              <AnimatePresence>
                {showCard && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-6 rounded-card border border-line bg-surface p-7 shadow-petal"
                  >
                    {bouquet.recipientName && (
                      <p className="font-display text-2xl text-ink">{bouquet.recipientName},</p>
                    )}
                    {bouquet.message ? (
                      <p className="mt-3 text-lg leading-relaxed whitespace-pre-line text-ink">
                        {bouquet.message}
                      </p>
                    ) : (
                      <p className="mt-3 text-lg leading-relaxed text-ink-soft">
                        No note, just flowers.
                      </p>
                    )}
                    {bouquet.senderName && (
                      <p className="mt-5 text-right font-display text-xl text-ink-soft">
                        {bouquet.senderName}
                      </p>
                    )}

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                      <p className="text-sm text-ink-faint">
                        Yours to keep. The link will not expire.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleDownload()}
                      >
                        Save as image
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {showCard && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 rounded-card border border-dashed border-line-strong p-6 text-center"
                >
                  <h2 className="font-display text-2xl text-ink">Send one back?</h2>
                  <p className="mt-2 text-sm text-ink-soft">
                    {APP_NAME} is free, and nobody has to make an account.
                  </p>
                  <ButtonLink to="/" size="lg" className="mt-4">
                    Make your own
                  </ButtonLink>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}

/** The bare page frame the recipient experience sits in. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full flex-1 items-center justify-center">{children}</div>

      <footer className="mt-10 flex items-center gap-4">
        <MusicToggle />
        <Link
          to="/"
          className="text-sm font-semibold text-ink-faint underline-offset-4 hover:text-accent-ink hover:underline"
        >
          Made with {APP_NAME}
        </Link>
        {canNativeShare() && <span className="sr-only">Sharing is available</span>}
      </footer>
    </div>
  );
}
