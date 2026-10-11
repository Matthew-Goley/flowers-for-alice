import { describe, expect, it } from 'vitest';
import { buildLetterBouquet, layoutLines, isSupportedLetterText } from '../lib/letters';
import { MAX_LETTER_FLOWERS, type FlowerType } from '../types/bouquet';

const PALETTE = ['#cf6382', '#f3bccb'];
const TYPES: FlowerType[] = ['daisy', 'rose'];

function build(text: string, seed = 9) {
  return buildLetterBouquet({ text, palette: PALETTE, types: TYPES, seed });
}

describe('layoutLines', () => {
  it('keeps a short word on one line', () => {
    expect(layoutLines('HELLO')).toEqual(['HELLO']);
  });

  it('upper-cases as it goes', () => {
    expect(layoutLines('mum')).toEqual(['MUM']);
  });

  it('wraps at spaces, keeping whole words together', () => {
    expect(layoutLines('BE KIND')).toEqual(['BE KIND']);
    expect(layoutLines('HAPPY BIRTHDAY')).toEqual(['HAPPY', 'BIRTHDAY']);
    expect(layoutLines('THANK YOU')).toEqual(['THANK', 'YOU']);
  });

  it('splits a word that cannot fit on any line', () => {
    expect(layoutLines('CONGRATULATIONS')).toEqual(['CONGRATU', 'LATIONS']);
  });

  it('returns nothing for empty input', () => {
    expect(layoutLines('')).toEqual([]);
    expect(layoutLines('   ')).toEqual([]);
  });

  it('collapses repeated spaces', () => {
    expect(layoutLines('A    B')).toEqual(['A B']);
  });
});

describe('buildLetterBouquet', () => {
  it('produces blooms for a word', () => {
    const flowers = build('HI');
    expect(flowers.length).toBeGreaterThan(10);
  });

  it('produces nothing for empty text', () => {
    expect(build('')).toEqual([]);
    expect(build('   ')).toEqual([]);
  });

  it('keeps every bloom on the canvas', () => {
    for (const text of ['A', 'HELLO', 'HAPPY BIRTHDAY', 'CONGRATULATIONS']) {
      for (const flower of build(text)) {
        expect(flower.x).toBeGreaterThanOrEqual(-6);
        expect(flower.x).toBeLessThanOrEqual(106);
        expect(flower.y).toBeGreaterThanOrEqual(-6);
        expect(flower.y).toBeLessThanOrEqual(106);
      }
    }
  });

  it('never exceeds the API ceiling, even for the longest allowed text', () => {
    const longest = 'WWWWWWWWWWWWWWWWWWWW'; // 20 chars, the densest glyph
    expect(build(longest).length).toBeLessThanOrEqual(MAX_LETTER_FLOWERS);
  });

  it('is deterministic for a given seed', () => {
    expect(build('LOVE', 5)).toEqual(build('LOVE', 5));
  });

  it('varies with the seed', () => {
    expect(build('LOVE', 5)).not.toEqual(build('LOVE', 6));
  });

  it('cycles the palette and the flower types', () => {
    const flowers = build('HELLO');
    expect(new Set(flowers.map((f) => f.color))).toEqual(new Set(PALETTE));
    expect(new Set(flowers.map((f) => f.type))).toEqual(new Set(TYPES));
  });

  it('emits API-valid geometry', () => {
    for (const flower of build('THANK YOU')) {
      expect(flower.scale).toBeGreaterThanOrEqual(0.1);
      expect(flower.scale).toBeLessThanOrEqual(4);
      expect(Math.abs(flower.rotation)).toBeLessThanOrEqual(360);
    }
  });

  it('uses smaller blooms for longer text', () => {
    const short = build('HI')[0]?.scale ?? 0;
    const long = build('CONGRATULATIONS')[0]?.scale ?? 0;
    expect(long).toBeLessThan(short);
  });

  it('spaces add no flowers of their own', () => {
    const withSpace = build('A B').length;
    const withoutSpace = build('AB').length;
    expect(withSpace).toBe(withoutSpace);
  });

  it('draws more blooms for a wider word', () => {
    expect(build('HELLO').length).toBeGreaterThan(build('HI').length);
  });

  it('handles every supported letter', () => {
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      expect(build(letter).length).toBeGreaterThan(3);
    }
  });
});

describe('isSupportedLetterText', () => {
  it('accepts letters and spaces', () => {
    expect(isSupportedLetterText('BE KIND')).toBe(true);
    expect(isSupportedLetterText('')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isSupportedLetterText('HI!')).toBe(false);
    expect(isSupportedLetterText('2024')).toBe(false);
  });
});
