/**
 * / - the whole public site.
 *
 * Shows the newest bouquet, or a single flower before anyone has made one.
 * The only control is the menu in the bottom-left corner, which leads to the
 * code prompt and from there to the builder.
 *
 * The first visit of each page load opens behind a wall of flowers that
 * falls away once the bouquet is ready (see FlowerWall).
 *
 * A scheduled bouquet arrives without its contents (the server withholds
 * them until the reveal date), so it is drawn wrapped, with a countdown.
 */

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BouquetCanvas, { type BouquetScene } from '../components/BouquetCanvas';
import Countdown from '../components/Countdown';
import FlowerWall from '../components/FlowerWall';
import HomeMenu from '../components/HomeMenu';
import { FLOWERS } from '../components/flowers';
import { fetchHome } from '../lib/api';
import { useArtColors } from '../lib/theme';
import type { OpenBouquet, SharedBouquet } from '../types/bouquet';

type Status = 'loading' | 'empty' | 'ready';

/**
 * Whether the wall has already fallen in this page load. Module state, not
 * component state, so coming back from the builder does not replay it; it is
 * only set once the wall finishes, which keeps StrictMode's double mount from
 * skipping it.
 */
let wallPlayed = false;

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>('loading');
  const [bouquet, setBouquet] = useState<SharedBouquet | null>(null);
  const [showWall, setShowWall] = useState(() => !wallPlayed && !reduceMotion);

  const wallDone = useCallback(() => {
    wallPlayed = true;
    setShowWall(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHome(controller.signal)
      .then((result) => {
        setBouquet(result);
        setStatus(result ? 'ready' : 'empty');
      })
      .catch(() => {
        // Unreachable server or not: the page still has something to show.
        if (!controller.signal.aborted) setStatus('empty');
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      {/* Nothing renders while loading, so the lone flower never flashes up
          in front of a bouquet that is about to arrive. */}
      {status === 'empty' && <LoneFlower />}
      {status === 'ready' && bouquet && !bouquet.locked && <OpenView bouquet={bouquet} />}
      {status === 'ready' && bouquet?.locked && (
        <SealedView
          scene={{
            mode: bouquet.mode,
            flowers: [],
            greenery: 'none',
            wrap: bouquet.wrap,
            ribbon: bouquet.ribbon,
            mono: false,
          }}
          recipientName={bouquet.recipientName}
          revealAt={bouquet.revealAt}
        />
      )}

      <HomeMenu />
      {showWall && <FlowerWall ready={status !== 'loading'} onDone={wallDone} />}
    </div>
  );
}

/** One stemmed rose, swaying slightly: the page before any bouquet exists. */
function LoneFlower() {
  const { paper } = useArtColors();
  const reduceMotion = useReducedMotion();
  const Rose = FLOWERS.rose.art;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[14rem]"
    >
      <motion.svg
        viewBox="0 0 100 180"
        className="w-full"
        role="img"
        aria-label="A single rose"
        style={{ transformOrigin: '50% 100%' }}
        animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
        transition={
          reduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <path
          d="M50 176 C 48 140, 53 110, 50 70"
          fill="none"
          stroke="#5c7d52"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <path d="M50 128 C 36 120, 27 124, 22 113 C 34 109, 44 114, 50 128 Z" fill="#7d9c70" />
        <path d="M51 104 C 63 95, 72 98, 78 88 C 66 85, 56 91, 51 104 Z" fill="#7d9c70" />
        <g transform="translate(14 22) scale(0.72)">
          <Rose color={FLOWERS.rose.defaultColor} mono={false} paper={paper} />
        </g>
      </motion.svg>
    </motion.div>
  );
}

function OpenView({ bouquet }: { bouquet: OpenBouquet }) {
  const { paper, ink } = useArtColors();

  const scene: BouquetScene = {
    mode: bouquet.mode,
    flowers: bouquet.flowers,
    greenery: bouquet.greenery,
    wrap: bouquet.wrap,
    ribbon: bouquet.ribbon,
    mono: bouquet.mono,
  };

  const hasNote = Boolean(bouquet.recipientName || bouquet.message || bouquet.senderName);

  // Drawn whole: the flower wall is the reveal, so nothing is staged here.
  return (
    <div className="w-full max-w-lg">
      <BouquetCanvas
        scene={scene}
        paper={paper}
        ink={ink}
        className="aspect-square w-full"
        title={bouquet.recipientName ? `A bouquet for ${bouquet.recipientName}` : 'A bouquet'}
      />

      {hasNote && (
        <div className="mx-auto mt-6 max-w-md text-center">
          {bouquet.recipientName && (
            <p className="font-display text-2xl text-ink">{bouquet.recipientName},</p>
          )}
          {bouquet.message && (
            <p className="mt-3 text-lg leading-relaxed whitespace-pre-line text-ink">
              {bouquet.message}
            </p>
          )}
          {bouquet.senderName && (
            <p className="mt-4 font-display text-xl text-ink-soft">{bouquet.senderName}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SealedView({
  scene,
  recipientName,
  revealAt,
}: {
  scene: BouquetScene;
  recipientName: string;
  revealAt: string;
}) {
  const { paper, ink } = useArtColors();

  return (
    <div className="w-full max-w-sm text-center">
      {recipientName && (
        <p className="font-display text-2xl text-ink-soft">For {recipientName}</p>
      )}
      <BouquetCanvas
        scene={scene}
        paper={paper}
        ink={ink}
        sealed
        className="mx-auto mt-4 aspect-square w-full max-w-xs"
        title="A wrapped bouquet, not yet open"
      />
      <h1 className="mt-6 font-display text-3xl text-ink">Not just yet.</h1>
      <Countdown target={revealAt} className="mt-5" />
    </div>
  );
}
