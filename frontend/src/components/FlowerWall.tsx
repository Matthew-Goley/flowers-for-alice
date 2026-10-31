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
 * there so gaps between blooms never show the page early.
 *
 * Purely decorative and never persisted, so it draws from a fresh seed each
 * visit rather than a stored one.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FLOWER_LIST, FLOWERS } from './flowers';
import { useArtColors } from '../lib/theme';
import { between, makeRng, newSeed } from '../lib/random';
import type { FlowerType } from '../types/bouquet';

/** Grid pitch in pixels; each bloom is drawn larger than this so they overlap. */
const CELL = 88;
const BLOOM = CELL * 1.6;
/** Shortest time the wall stands before falling, in ms. */
const MIN_HOLD = 900;
/** Spread of start times from the top row to the bottom row, in ms. */
const CASCADE = 750;
const FALL_MIN = 1000;
const FALL_MAX = 1350;
const JITTER = 250;

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

  // Laid out once, at the size of the screen it first appears on.
  const wall = useMemo(() => layWall(window.innerWidth, window.innerHeight), []);
  const falling = ready && held;

  useEffect(() => {
    const timer = setTimeout(() => setHeld(true), MIN_HOLD);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!falling) return;
    const timer = setTimeout(onDone, wall.total + 50);
    return () => clearTimeout(timer);
  }, [falling, onDone, wall.total]);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-colors duration-500 ${
        falling ? 'pointer-events-none bg-transparent' : 'bg-white'
      }`}
      aria-hidden="true"
    >
      {wall.flowers.map((flower) => {
        const Art = FLOWERS[flower.type].art;
        const style = {
          left: flower.left,
          top: flower.top,
          width: BLOOM,
          height: BLOOM,
          '--wall-spin': `${flower.spin}deg`,
          animationDelay: `${flower.delay}ms`,
          animationDuration: `${flower.duration}ms`,
        } as CSSProperties;

        return (
          <div
            key={flower.key}
            className={`wall-flower ${falling ? 'is-falling' : ''}`}
            style={style}
          >
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
      })}
    </div>
  );
}
