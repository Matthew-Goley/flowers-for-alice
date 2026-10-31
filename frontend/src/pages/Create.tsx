/**
 * /create - the builder, behind the code.
 *
 * Without an accepted code for this session it bounces home, where the menu
 * asks for one. The server checks the code again when the bouquet is saved.
 */

import { Link, Navigate } from 'react-router-dom';
import Builder from '../builder/Builder';
import { readCode } from '../lib/unlock';

export default function Create() {
  if (!readCode()) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M8.2 4.6 9.6 6l-3 3H16v2H6.6l3 3-1.4 1.4L2.8 10z" />
        </svg>
        Home
      </Link>
      <Builder />
    </div>
  );
}
