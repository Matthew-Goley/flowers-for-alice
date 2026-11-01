import { describe, expect, it } from 'vitest';
import {
  arrangeBouquet,
  clampToCanvas,
  moveFlower,
  normaliseAngle,
  reshuffle,
  rotateFlower,
  splitRows,
  stemsFromCounts,
  variantsFor,
  type Stem,
} from '../lib/arrange';
import { makeRng, shuffled } from '../lib/random';
import type { FlowerType } from '../types/bouquet';

function stems(count: number, type: FlowerType = 'rose'): Stem[] {
  return Array.from({ length: count }, () => ({ type, color: '#cf6382' }));
}

describe('arrangeBouquet', () => {
  it('places every stem it is given', () => {
    for (const count of [1, 6, 7, 10]) {
      expect(arrangeBouquet(stems(count), 42)).toHaveLength(count);
    }
  });

  it('returns nothing for an empty bouquet', () => {
    expect(arrangeBouquet([], 42)).toEqual([]);
  });

  it('keeps every bloom inside the canvas', () => {
    const flowers = arrangeBouquet(stems(10), 7);
    for (const flower of flowers) {
      expect(flower.x).toBeGreaterThanOrEqual(-6);
      expect(flower.x).toBeLessThanOrEqual(106);
      expect(flower.y).toBeGreaterThanOrEqual(-6);
      expect(flower.y).toBeLessThanOrEqual(106);
    }
  });

  it('produces values the API will accept', () => {
    const flowers = arrangeBouquet(stems(9), 3);
    for (const flower of flowers) {
      expect(flower.rotation).toBeGreaterThanOrEqual(-360);
      expect(flower.rotation).toBeLessThanOrEqual(360);
      expect(flower.scale).toBeGreaterThanOrEqual(0.1);
      expect(flower.scale).toBeLessThanOrEqual(4);
      expect(flower.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(arrangeBouquet(stems(8), 123)).toEqual(arrangeBouquet(stems(8), 123));
  });

  it('gives a different composition for a different seed', () => {
    const a = arrangeBouquet(stems(8), 1);
    const b = arrangeBouquet(stems(8), 2);
    expect(a).not.toEqual(b);
  });

  it('spreads flowers horizontally rather than stacking them', () => {
    const xs = arrangeBouquet(stems(9), 11).map((f) => f.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(25);
  });

  it('puts the back row above the front row', () => {
    const flowers = arrangeBouquet(stems(10), 5);
    // splitRows sends the first five to the back arc.
    const backBottom = Math.max(...flowers.slice(0, 5).map((f) => f.y));
    const frontTop = Math.min(...flowers.slice(5).map((f) => f.y));
    expect(backBottom).toBeLessThan(frontTop + 6);
  });

  it('overlaps neighbouring blooms so the bouquet reads as a bunch', () => {
    const flowers = arrangeBouquet(stems(8), 21);
    const sorted = [...flowers].sort((a, b) => a.x - b.x);
    const gaps = sorted.slice(1).map((flower, i) => Math.abs(flower.x - (sorted[i]?.x ?? 0)));
    // Nominal bloom width is about 20 units, so neighbours must be closer.
    expect(Math.max(...gaps)).toBeLessThan(20);
  });
});

describe('splitRows', () => {
  it('keeps six or fewer stems in a single fan', () => {
    expect(splitRows(stems(6)).front).toHaveLength(0);
    expect(splitRows(stems(6)).back).toHaveLength(6);
  });

  it('gives the odd stem to the back row', () => {
    const { back, front } = splitRows(stems(7));
    expect(back).toHaveLength(4);
    expect(front).toHaveLength(3);
  });

  it('splits an even count evenly', () => {
    const { back, front } = splitRows(stems(10));
    expect(back).toHaveLength(5);
    expect(front).toHaveLength(5);
  });
});

describe('reshuffle', () => {
  it('keeps exactly the same blooms', () => {
    const before = arrangeBouquet(
      [
        { type: 'rose', color: '#cf6382' },
        { type: 'rose', color: '#cf6382' },
        { type: 'peony', color: '#f3bccb' },
        { type: 'daisy', color: '#fbf3e7' },
        { type: 'lily', color: '#ffffff' },
        { type: 'tulip', color: '#e07a5f' },
      ],
      1,
    );
    const after = reshuffle(before, 99);

    const tally = (list: typeof before) =>
      list.reduce<Record<string, number>>((acc, f) => {
        acc[`${f.type}:${f.color}`] = (acc[`${f.type}:${f.color}`] ?? 0) + 1;
        return acc;
      }, {});

    expect(tally(after)).toEqual(tally(before));
    expect(after).toHaveLength(before.length);
  });

  it('actually moves things', () => {
    const before = arrangeBouquet(stems(8), 4);
    expect(reshuffle(before, 5000)).not.toEqual(before);
  });
});

describe('moveFlower', () => {
  it('moves only the targeted bloom', () => {
    const flowers = arrangeBouquet(stems(6), 8);
    const moved = moveFlower(flowers, 2, 12, 34);

    expect(moved[2]?.x).toBe(12);
    expect(moved[2]?.y).toBe(34);
    expect(moved[0]).toEqual(flowers[0]);
    expect(moved[2]?.type).toBe(flowers[2]?.type);
  });

  it('clamps a drag that leaves the canvas', () => {
    const flowers = arrangeBouquet(stems(6), 8);
    const moved = moveFlower(flowers, 0, -500, 900);
    expect(moved[0]?.x).toBe(-6);
    expect(moved[0]?.y).toBe(106);
  });

  it('does not mutate the input', () => {
    const flowers = arrangeBouquet(stems(6), 8);
    const snapshot = structuredClone(flowers);
    moveFlower(flowers, 1, 0, 0);
    expect(flowers).toEqual(snapshot);
  });
});

describe('rotateFlower', () => {
  it('turns only the targeted bloom, leaving its position alone', () => {
    const flowers = arrangeBouquet(stems(6), 8);
    const turned = rotateFlower(flowers, 3, 45);
    expect(turned[3]?.rotation).toBe(45);
    expect(turned[3]?.x).toBe(flowers[3]?.x);
    expect(turned[0]).toEqual(flowers[0]);
  });

  it('keeps any number of spins inside the range the API accepts', () => {
    const flowers = arrangeBouquet(stems(6), 8);
    for (const angle of [721, -900, 3600.5, -181]) {
      const rotation = rotateFlower(flowers, 0, angle)[0]?.rotation ?? NaN;
      expect(rotation).toBeGreaterThan(-180);
      expect(rotation).toBeLessThanOrEqual(180);
    }
  });

  it('does not mutate the input', () => {
    const flowers = arrangeBouquet(stems(6), 8);
    const snapshot = structuredClone(flowers);
    rotateFlower(flowers, 1, 90);
    expect(flowers).toEqual(snapshot);
  });
});

describe('variantsFor', () => {
  it('numbers each flower among its own kind, in array order', () => {
    const flowers = arrangeBouquet(
      [
        { type: 'rose', color: '#cf6382' },
        { type: 'tulip', color: '#e07a5f' },
        { type: 'rose', color: '#cf6382' },
        { type: 'rose', color: '#f3bccb' },
        { type: 'tulip', color: '#e07a5f' },
        { type: 'daisy', color: '#fbf3e7' },
      ],
      3,
    );
    const expected = new Map<string, number>();
    const variants = variantsFor(flowers);
    flowers.forEach((flower, i) => {
      const n = expected.get(flower.type) ?? 0;
      expect(variants[i]).toBe(n);
      expected.set(flower.type, n + 1);
    });
  });

  it('gives the first of every kind the canonical drawing', () => {
    const flowers = arrangeBouquet(stems(4, 'peony').concat(stems(3, 'lily')), 5);
    const firsts = new Set<string>();
    variantsFor(flowers).forEach((variant, i) => {
      const type = flowers[i]?.type ?? '';
      if (!firsts.has(type)) {
        expect(variant).toBe(0);
        firsts.add(type);
      }
    });
  });

  it('ignores position, so dragging a flower never changes how it is drawn', () => {
    const flowers = arrangeBouquet(stems(6), 8);
    const moved = moveFlower(flowers, 2, 10, 10);
    expect(variantsFor(moved)).toEqual(variantsFor(flowers));
  });
});

describe('normaliseAngle', () => {
  it('wraps to (-180, 180]', () => {
    expect(normaliseAngle(0)).toBe(0);
    expect(normaliseAngle(190)).toBe(-170);
    expect(normaliseAngle(-190)).toBe(170);
    expect(normaliseAngle(180)).toBe(180);
    expect(normaliseAngle(-180)).toBe(180);
    expect(normaliseAngle(360)).toBe(0);
  });
});

describe('clampToCanvas', () => {
  it('passes through values inside the canvas', () => {
    expect(clampToCanvas(50)).toBe(50);
  });

  it('clamps both ends', () => {
    expect(clampToCanvas(-99)).toBe(-6);
    expect(clampToCanvas(999)).toBe(106);
  });
});

describe('stemsFromCounts', () => {
  it('expands a tally into one stem per bloom', () => {
    const counts = new Map<FlowerType, number>([
      ['rose', 3],
      ['peony', 2],
    ]);
    const result = stemsFromCounts(counts, () => '#ffffff');

    expect(result).toHaveLength(5);
    expect(result.filter((s) => s.type === 'rose')).toHaveLength(3);
    expect(result.every((s) => s.color === '#ffffff')).toBe(true);
  });

  it('applies the colour resolver per type', () => {
    const counts = new Map<FlowerType, number>([
      ['rose', 1],
      ['daisy', 1],
    ]);
    const result = stemsFromCounts(counts, (type) => (type === 'rose' ? '#ff0000' : '#00ff00'));
    expect(result.find((s) => s.type === 'rose')?.color).toBe('#ff0000');
    expect(result.find((s) => s.type === 'daisy')?.color).toBe('#00ff00');
  });
});

describe('seeded random', () => {
  it('replays the same sequence for the same seed', () => {
    const a = Array.from({ length: 5 }, makeRng(77));
    const rng = makeRng(77);
    const b = Array.from({ length: 5 }, () => rng());
    expect(a.length).toBe(b.length);
    expect(makeRng(77)()).toBe(makeRng(77)());
  });

  it('keeps every element when shuffling', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(input, makeRng(3));
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });
});
