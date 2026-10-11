/**
 * /letters - the builder, opened straight into letter mode.
 */

import Builder from '../builder/Builder';
import Layout from '../components/Layout';
import { Eyebrow } from '../components/ui';

export default function LettersPage() {
  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6">
        <Eyebrow>Letter bouquet</Eyebrow>
        <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
          Spell it out in flowers.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
          Type a name or a short message and every letter is drawn from small blooms. Up to
          twenty characters, A to Z and spaces.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Builder mode="letters" />
      </section>
    </Layout>
  );
}
