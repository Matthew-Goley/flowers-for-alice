/**
 * The opening curtain: a wall of flowers that covers the screen on arrival,
 * then tumbles off the bottom to reveal the page.
 *
 * It holds until the page underneath is ready (and for a short minimum, so a
 * fast load still gets a moment of wall), then the rows fall top first. Each
 * top row is painted above the rows below it, so the falling flowers sweep
 * down over the ones still standing, and the reveal runs top to bottom.
 *
 * The white ground behind the flowers fades as they start to fall; it is only
 * there so gaps between blooms never show the page early. It is 98.5% opaque,
 * not 100%, on purpose: a fully opaque cover lets the browser skip painting
 * the bouquet underneath until the fall reveals it, and that first paint of a
 * detailed SVG then lands on the first frames of the animation as a stall. A
 * hair of translucency makes it paint while the wall is still standing.
 *
 * Purely decorative and never persisted, so it draws from a fresh seed each
 * visit rather than a stored one.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArtDetailContext, FLOWER_LIST, FLOWERS, type ArtDetail } from './flowers';
import { useArtColors } from '../lib/theme';
import { between, makeRng, newSeed } from '../lib/random';
import type { FlowerType } from '../types/bouquet';

/**
 * Grid pitch in pixels; each bloom is drawn larger than this so they overlap.
 * Kept coarse on purpose: every flower is a detailed SVG (100 to 200 elements),
 * and a finer grid costs real main-thread time on the first paint.
 */
const CELL = 124;
const BLOOM = CELL * 1.55;
/** Shortest time the wall stands before falling, in ms. */
const MIN_HOLD = 900;
/** Spread of start times from the top row to the bottom row, in ms. */
const CASCADE = 750;
const FALL_MIN = 1000;
const FALL_MAX = 1350;
const JITTER = 250;
/** Ease-in, like something let go of: slow to start, fast by the bottom. */
const FALL_EASING = 'cubic-bezier(0.5, 0, 0.8, 0.25)';

interface WallFlower {
  key: string;
  type: FlowerType;
  color: string;
  left: number;
  top: number;
  rotation: number;
  spin: number;
  delay: number;
  duration: number;
}

function layWall(width: number, height: number): { flowers: WallFlower[]; total: number } {
  const rng = makeRng(newSeed());
  const cols = Math.ceil(width / CELL) + 2;
  const rows = Math.ceil(height / CELL) + 2;
  const flowers: WallFlower[] = [];
  let total = 0;

  // Bottom row first in the DOM, so each row above paints over it.
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let col = 0; col < cols; col += 1) {
      const info = FLOWER_LIST[Math.floor(rng() * FLOWER_LIST.length)] ?? FLOWER_LIST[0];
      if (!info) continue;
      const palette = info.suggested.length > 0 ? info.suggested : [info.defaultColor];
      const color = palette[Math.floor(rng() * palette.length)] ?? info.defaultColor;
      const offset = row % 2 === 0 ? 0 : CELL / 2;
      const delay = (row / rows) * CASCADE + rng() * JITTER;
      const duration = between(rng, FALL_MIN, FALL_MAX);
      total = Math.max(total, delay + duration);

      flowers.push({
        key: `${row}-${col}`,
        type: info.type,
        color,
        left: (col - 1) * CELL + offset + between(rng, -14, 14) - (BLOOM - CELL) / 2,
        top: (row - 1) * CELL + between(rng, -14, 14) - (BLOOM - CELL) / 2,
        rotation: between(rng, -40, 40),
        spin: between(rng, -160, 160),
        delay,
        duration,
      });
    }
  }
  return { flowers, total };
}

export default function FlowerWall({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { paper } = useArtColors();
  const [held, setHeld] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Laid out once, at the size of the screen it first appears on.
  const wall = useMemo(() => layWall(window.innerWidth, window.innerHeight), []);
  const falling = ready && held;

  // Touch devices and narrow screens get lighter flowers: the same shapes and
  // colours without the decorative layers, so a phone paints the wall fast.
  const [detail] = useState<ArtDetail>(() =>
    window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768
      ? 'lite'
      : 'full',
  );

  // Built once: these elements are the same objects on every render, so React
  // skips them entirely when the wall starts to fall, instead of re-rendering
  // thousands of SVG nodes at the moment the animation needs the main thread.
  const blooms = useMemo(
    () =>
      wall.flowers.map((flower) => {
        const Art = FLOWERS[flower.type].art;
        const style: CSSProperties = {
          left: flower.left,
          top: flower.top,
          width: BLOOM,
          height: BLOOM,
        };

        return (
          <div key={flower.key} className="wall-flower" style={style}>
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <g transform={`rotate(${flower.rotation} 50 50)`}>
                <Art color={flower.color} mono={false} paper={paper} />
              </g>
            </svg>
          </div>
        );
      }),
    [wall, paper],
  );

  useEffect(() => {
    const timer = setTimeout(() => setHeld(true), MIN_HOLD);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!falling) return;
    const timer = setTimeout(onDone, wall.total + 50);
    return () => clearTimeout(timer);
  }, [falling, onDone, wall.total]);

  /*
   * The fall runs on the Web Animations API, not a CSS class. Adding a class
   * to the container (or to every flower) makes the browser recheck the style
   * of every SVG node inside, thousands of them, on the first frame of the
   * fall; on a phone that was a visible stall. element.animate() changes no
   * classes, and a transform-only animation runs on the compositor.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!falling || !container) return;
    const drop = window.innerHeight + 220;
    const animations = Array.from(
      container.querySelectorAll<HTMLElement>('.wall-flower'),
      (element, i) => {
        const flower = wall.flowers[i];
        if (!flower) return null;
        return element.animate(
          [
            { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
            { transform: `translate3d(0, ${drop}px, 0) rotate(${flower.spin}deg)` },
          ],
          { duration: flower.duration, delay: flower.delay, easing: FALL_EASING, fill: 'both' },
        );
      },
    );
    return () => animations.forEach((animation) => animation?.cancel());
  }, [falling, wall]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 overflow-hidden transition-colors duration-500 ${
        falling ? 'pointer-events-none bg-transparent' : 'bg-white/[0.985]'
      }`}
      aria-hidden="true"
    >
      <ArtDetailContext.Provider value={detail}>{blooms}</ArtDetailContext.Provider>
    </div>
  );
}
