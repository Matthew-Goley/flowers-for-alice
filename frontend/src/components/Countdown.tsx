/**
 * Countdown to a scheduled bouquet's reveal.
 *
 * Ticks once a second, and reloads the page when it reaches zero so the
 * server hands over the real contents. The contents are not in the browser
 * before that point, so there is nothing to reveal client-side.
 */

import { useEffect, useState } from 'react';

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function remaining(target: string): Parts {
  const ms = new Date(target).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const seconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    done: false,
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-2xl border border-line bg-surface px-3 py-2.5">
      <span className="font-display text-2xl tabular-nums text-ink">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[0.68rem] font-semibold tracking-wide text-ink-faint uppercase">
        {label}
      </span>
    </div>
  );
}

export default function Countdown({
  target,
  className = '',
}: {
  target: string;
  className?: string;
}) {
  const [parts, setParts] = useState(() => remaining(target));

  useEffect(() => {
    const timer = setInterval(() => {
      const next = remaining(target);
      setParts(next);
      if (next.done) {
        clearInterval(timer);
        // Ask the server again: it is the only thing holding the flowers.
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const opensOn = new Date(target).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className={className}>
      <div
        className="flex items-center justify-center gap-2"
        role="timer"
        aria-live="off"
        aria-label={`Opens in ${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes`}
      >
        <Unit value={parts.days} label="days" />
        <Unit value={parts.hours} label="hrs" />
        <Unit value={parts.minutes} label="min" />
        <Unit value={parts.seconds} label="sec" />
      </div>
      <p className="mt-3 text-sm text-ink-soft">Opens on {opensOn}.</p>
    </div>
  );
}
