/**
 * The page chrome: header, footer and the skip link.
 *
 * The recipient page opts out of this (it is meant to feel like opening a
 * gift, not visiting a website), so the layout is applied per route rather
 * than wrapped around the whole router.
 */

import { useId, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { APP_NAME, DOMAIN, TAGLINE } from '../config';
import { useTheme } from '../lib/theme';
import { OCCASIONS } from '../lib/occasions';

function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="15" className="fill-accent-wash" />
        <g className="fill-accent">
          <ellipse cx="16" cy="9.5" rx="4" ry="6" />
          <ellipse cx="16" cy="22.5" rx="4" ry="6" />
          <ellipse cx="9.5" cy="16" rx="6" ry="4" />
          <ellipse cx="22.5" cy="16" rx="6" ry="4" />
        </g>
        <circle cx="16" cy="16" r="3.4" className="fill-gold-400" />
      </svg>
      {/* nowrap: a two-word product name otherwise stacks at phone widths. */}
      <span className="font-display text-lg font-semibold tracking-tight whitespace-nowrap text-ink sm:text-xl">
        {APP_NAME}
      </span>
    </span>
  );
}

function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-pill border border-line-strong bg-surface p-2.5 text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
      aria-label={isDark ? 'Switch to the light theme' : 'Switch to the dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="4.4" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
          <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" />
        </svg>
      )}
    </button>
  );
}

const NAV_CLASS = ({ isActive }: { isActive: boolean }) =>
  `rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-accent-wash text-accent-ink' : 'text-ink-soft hover:text-ink'
  }`;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="rounded-xl" aria-label={`${APP_NAME} home`}>
          <Logo />
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
          {/* The logo already links home, so this is redundant on a phone. */}
          <NavLink to="/" className={(state) => `${NAV_CLASS(state)} hidden sm:block`} end>
            Make one
          </NavLink>
          <NavLink to="/garden" className={NAV_CLASS}>
            Garden
          </NavLink>
          <NavLink to="/letters" className={NAV_CLASS}>
            <span className="hidden sm:inline">Letter bouquet</span>
            <span className="sm:hidden">Letters</span>
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-sunk">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">{TAGLINE}</p>
          <p className="mt-4 text-xs text-ink-faint">
            Free, no account, no app. Every flower drawn by hand for this site.
          </p>
        </div>

        <nav aria-label="Pages">
          <h2 className="mb-3 text-xs font-bold tracking-[0.18em] text-ink-faint uppercase">
            Pages
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="text-ink-soft hover:text-accent-ink">
                Build a bouquet
              </Link>
            </li>
            <li>
              <Link to="/letters" className="text-ink-soft hover:text-accent-ink">
                Letter bouquet
              </Link>
            </li>
            <li>
              <Link to="/garden" className="text-ink-soft hover:text-accent-ink">
                The garden
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Occasions">
          <h2 className="mb-3 text-xs font-bold tracking-[0.18em] text-ink-faint uppercase">
            Occasions
          </h2>
          <ul className="space-y-2 text-sm">
            {OCCASIONS.map((occasion) => (
              <li key={occasion.slug}>
                <Link
                  to={`/occasion/${occasion.slug}`}
                  className="text-ink-soft hover:text-accent-ink"
                >
                  {occasion.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-faint sm:px-6">
          {APP_NAME} {year} &middot; {DOMAIN}
        </p>
      </div>
    </footer>
  );
}

export interface LayoutProps {
  children: ReactNode;
  /** Drop the footer on pages that end in their own call to action. */
  footer?: boolean;
}

export default function Layout({ children, footer = true }: LayoutProps) {
  const mainId = useId().replace(/:/g, '');

  return (
    <div className="flex min-h-full flex-col">
      <a href={`#${mainId}`} className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id={mainId} className="flex-1">
        {children}
      </main>
      {footer && <Footer />}
    </div>
  );
}
