/**
 * Optional background music, off by default.
 *
 * Synthesised with the Web Audio API rather than shipped as an audio file:
 * a loop long enough not to annoy anyone would be a megabyte or two, and the
 * point here is a few soft notes behind a bouquet, not a soundtrack.
 *
 * Notes are drawn from a pentatonic scale, so any order of them is consonant.
 * Playback only ever starts from the button, which is the user gesture
 * browsers require before audio may begin.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../config';

/** A major pentatonic scale in Hz, roughly C5 to C6. */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
const NOTE_GAP_MS = 1400;

interface Voice {
  context: AudioContext;
  master: GainNode;
  timer: number;
}

function playNote(context: AudioContext, destination: GainNode, frequency: number): void {
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;

  // A slow swell and a long tail: closer to a music box than a beep.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

  osc.connect(gain).connect(destination);
  osc.start(now);
  osc.stop(now + 2.8);
}

export default function MusicToggle({ className = '' }: { className?: string }) {
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  const voice = useRef<Voice | null>(null);

  const stop = useCallback(() => {
    const current = voice.current;
    if (!current) return;
    window.clearInterval(current.timer);
    current.master.gain.setTargetAtTime(0.0001, current.context.currentTime, 0.3);
    // Let the tail finish before tearing the context down.
    window.setTimeout(() => void current.context.close().catch(() => {}), 1200);
    voice.current = null;
  }, []);

  const start = useCallback(() => {
    try {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);

      let index = 2;
      const step = () => {
        // Wander up and down the scale rather than jumping about.
        index = Math.max(0, Math.min(SCALE.length - 1, index + (Math.random() < 0.5 ? -1 : 1)));
        playNote(context, master, SCALE[index] ?? SCALE[0] ?? 523.25);
      };

      step();
      const timer = window.setInterval(step, NOTE_GAP_MS);
      voice.current = { context, master, timer };
      return true;
    } catch {
      setAvailable(false);
      return false;
    }
  }, []);

  const toggle = useCallback(() => {
    if (playing) {
      stop();
      setPlaying(false);
      try {
        localStorage.setItem(STORAGE_KEYS.music, 'off');
      } catch {
        /* preference is a nicety */
      }
      return;
    }
    if (start()) {
      setPlaying(true);
      try {
        localStorage.setItem(STORAGE_KEYS.music, 'on');
      } catch {
        /* preference is a nicety */
      }
    }
  }, [playing, start, stop]);

  // Always stop on unmount; never auto-start, even if the stored preference
  // says "on". Sound that begins without a tap is the thing people hate.
  useEffect(() => stop, [stop]);

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      className={`inline-flex items-center gap-2 rounded-pill border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent-ink ${className}`}
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" />
          <path
            d="M15.4 9a4.2 4.2 0 0 1 0 6M18 6.4a7.8 7.8 0 0 1 0 11.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" />
          <path
            d="m16 9.5 5 5m0-5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
      {playing ? 'Music on' : 'Music off'}
    </button>
  );
}
