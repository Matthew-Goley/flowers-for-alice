/**
 * The photos scattered faintly behind the home page bouquet.
 *
 * Small tilted prints at low opacity, with a white glow over the middle of
 * the screen so the bouquet always sits on clean paper. Purely decorative:
 * hidden from screen readers and from the pointer.
 */

import { useEffect, useMemo, useState } from 'react';
import { layPhotos } from '../lib/photoLayout';
import { PHOTOS } from '../lib/photos';

/** How visible the photos are at the edges of the screen. */
const OPACITY = 0.34;

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export default function PhotoBackdrop() {
  const [size, setSize] = useState(viewport);

  useEffect(() => {
    const onResize = () =>
      setSize((current) => {
        const next = viewport();
        // iOS changes the height as its toolbars show and hide on scroll;
        // ignore small height changes so the photos do not jump about.
        const sameWidth = next.width === current.width;
        const smallHeightChange = Math.abs(next.height - current.height) < current.height * 0.2;
        return sameWidth && smallHeightChange ? current : next;
      });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const placed = useMemo(() => layPhotos(PHOTOS, size.width, size.height), [size]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div style={{ opacity: OPACITY }}>
        {placed.map((photo) => (
          <img
            key={photo.src}
            src={photo.src}
            alt=""
            decoding="async"
            draggable={false}
            width={photo.width}
            height={photo.height}
            className="absolute rounded-[3px] border-[3px] border-white object-cover shadow-[0_1px_6px_rgba(0,0,0,0.18)]"
            style={{
              left: photo.x - photo.width / 2,
              top: photo.y - photo.height / 2,
              width: photo.width,
              height: photo.height,
              transform: `rotate(${photo.rotation.toFixed(1)}deg)`,
            }}
          />
        ))}
      </div>
      {/* Clears the middle, where the bouquet is, and fades out to the edges. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 46% 44% at 50% 50%, #fff 0%, rgba(255,255,255,0.88) 45%, rgba(255,255,255,0) 100%)',
        }}
      />
    </div>
  );
}
