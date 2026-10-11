/**
 * /occasion/:slug - the builder preloaded with a curated mix.
 */

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Builder from '../builder/Builder';
import Layout from '../components/Layout';
import { Eyebrow } from '../components/ui';
import { findOccasion, occasionPreset, OCCASIONS } from '../lib/occasions';
import NotFound from './NotFound';

export default function OccasionPage() {
  const { slug } = useParams<{ slug: string }>();
  const occasion = findOccasion(slug);
  const preset = useMemo(() => (occasion ? occasionPreset(occasion) : undefined), [occasion]);

  if (!occasion || !preset) return <NotFound />;

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-8 sm:px-6">
        <Eyebrow>Occasion</Eyebrow>
        <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
          {occasion.heading}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">{occasion.blurb}</p>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Other occasions">
          {OCCASIONS.map((other) => (
            <Link
              key={other.slug}
              to={`/occasion/${other.slug}`}
              aria-current={other.slug === occasion.slug ? 'page' : undefined}
              className={`rounded-pill border px-4 py-1.5 text-sm font-semibold transition-colors ${
                other.slug === occasion.slug
                  ? 'border-accent bg-accent-wash text-accent-ink'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong'
              }`}
            >
              {other.title}
            </Link>
          ))}
        </nav>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Builder key={occasion.slug} preset={preset} />
      </section>
    </Layout>
  );
}
