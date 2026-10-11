/**
 * A small seeded PRNG.
 *
 * Arrangements have to be reproducible: the same seed must lay the bouquet out
 * identically on every render, after a reload, and in the undo history. So
 * nothing in the layout code calls Math.random directly.
 */

export type Rng = () => number;

/** mulberry32: tiny, fast, and good enough for scattering petals. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** A fresh seed for a new arrangement. The one place Math.random is allowed. */
export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** Fisher-Yates, seeded. Returns a new array. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    // Guarded for noUncheckedIndexedAccess-style safety; indices are in range.
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}
