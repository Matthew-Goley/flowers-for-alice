import { describe, expect, it } from 'vitest';
import { layPhotos } from '../lib/photoLayout';
import { PHOTOS } from '../lib/photos';

const SCREENS = [
  [1280, 800],
  [1920, 1080],
  [390, 844],
  [768, 1024],
] as const;

describe('layPhotos', () => {
  it.each(SCREENS)('places every photo exactly once at %ix%i', (width, height) => {
    const placed = layPhotos(PHOTOS, width, height);
    expect(placed).toHaveLength(PHOTOS.length);
    expect(new Set(placed.map((photo) => photo.src)).size).toBe(PHOTOS.length);
  });

  it.each(SCREENS)('keeps photo centres out of the middle at %ix%i', (width, height) => {
    for (const photo of layPhotos(PHOTOS, width, height)) {
      const dx = Math.abs(photo.x - width / 2) / width;
      const dy = Math.abs(photo.y - height / 2) / height;
      expect(dx > 0.15 || dy > 0.2).toBe(true);
    }
  });

  it.each(SCREENS)(
    'gives every photo the same area, whatever its size, at %ix%i',
    (width, height) => {
      // Camera photos are 4000+ px originals and screenshots a few hundred px;
      // on screen they should match. Only very thin strips are capped smaller.
      const areas = layPhotos(PHOTOS, width, height)
        .filter((photo) => photo.width / photo.height < 2)
        .map((photo) => photo.width * photo.height);
      expect(areas.length).toBeGreaterThan(PHOTOS.length / 2);
      expect(Math.max(...areas) / Math.min(...areas)).toBeLessThan(1.05);
    },
  );

  it('is the same for the same screen', () => {
    expect(layPhotos(PHOTOS, 1280, 800)).toEqual(layPhotos(PHOTOS, 1280, 800));
  });

  it('returns nothing for no photos or no screen', () => {
    expect(layPhotos([], 1280, 800)).toEqual([]);
    expect(layPhotos(PHOTOS, 0, 0)).toEqual([]);
  });
});
