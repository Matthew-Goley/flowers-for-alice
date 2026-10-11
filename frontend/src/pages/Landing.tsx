/**
 * / - the home page.
 *
 * The builder is embedded directly rather than hidden behind a call to
 * action: the fastest way to explain what this is, is to let someone start
 * one. Everything below the fold is supporting material.
 */

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Builder from '../builder/Builder';
import BouquetCanvas from '../components/BouquetCanvas';
import Layout from '../components/Layout';
import { ButtonLink, Divider, Eyebrow } from '../components/ui';
import { APP_NAME } from '../config';
import { arrangeBouquet, type Stem } from '../lib/arrange';
import { OCCASIONS } from '../lib/occasions';
import { useArtColors } from '../lib/theme';

const HERO_STEMS: Stem[] = [
  { type: 'peony', color: '#f3bccb' },
  { type: 'rose', color: '#cf6382' },
  { type: 'ranunculus', color: '#f0b27a' },
  { type: 'anemone', color: '#8fb3d9' },
  { type: 'daisy', color: '#fbf3e7' },
  { type: 'tulip', color: '#e07a5f' },
  { type: 'dahlia', color: '#9f7bc0' },
  { type: 'lily', color: '#fbf3e7' },
];

const HERO_SCENE = {
  mode: 'bouquet' as const,
  flowers: arrangeBouquet(HERO_STEMS, 20_260_612),
  greenery: 'eucalyptus' as const,
  wrap: 'kraft' as const,
  ribbon: '#e4a0b7',
  mono: false,
};

const HOW_IT_WORKS = [
  {
    title: 'Pick your flowers',
    body: 'Twelve kinds, each in whatever colour you like. Six to ten stems makes a bouquet.',
  },
  {
    title: 'Arrange and wrap',
    body: 'We tie it for you. Shuffle until it looks right, nudge any bloom, then choose paper and ribbon.',
  },
  {
    title: 'Send the link',
    body: 'You get a short link. They tap it, the paper comes off, and your note is underneath.',
  },
];

const FAQS: { question: string; answer: ReactNode }[] = [
  {
    question: 'Is it really free?',
    answer:
      'Yes. No account, no email address, no payment. Build a bouquet, send the link, done.',
  },
  {
    question: 'How long does a bouquet last?',
    answer:
      'Indefinitely. The link keeps working, and unlike the real thing it will not start to smell in a week.',
  },
  {
    question: 'Can I schedule one for a birthday?',
    answer:
      'You can. On the wrap step, turn on "Save it for a date". Until that morning the recipient sees a wrapped parcel and a countdown, and the contents are not sent to their browser at all, so they cannot peek.',
  },
  {
    question: 'Does the recipient need anything?',
    answer: 'A web browser. It works on a phone, which is where most of these get opened.',
  },
  {
    question: 'Can I edit a bouquet after sending it?',
    answer:
      'No. Once a bouquet has a link it is fixed, which keeps the thing they open identical to the thing you made. Building another takes a minute.',
  },
  {
    question: 'Who can see my bouquet?',
    answer:
      'Anyone with the link, so treat it like a postcard rather than a sealed letter. Links are random eight-character ids and are not listed anywhere.',
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {FAQS.map((faq, index) => {
        const expanded = open === index;
        return (
          <li key={faq.question}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : index)}
                aria-expanded={expanded}
                aria-controls={`faq-panel-${index}`}
                id={`faq-button-${index}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-sunk"
              >
                <span className="font-display text-lg text-ink">{faq.question}</span>
                <span
                  className={`shrink-0 text-xl text-accent transition-transform duration-200 ${
                    expanded ? 'rotate-45' : ''
                  }`}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${index}`}
              role="region"
              aria-labelledby={`faq-button-${index}`}
              hidden={!expanded}
              className="px-5 pb-5 text-ink-soft"
            >
              <p className="max-w-2xl leading-relaxed">{faq.answer}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Landing() {
  const { paper, ink } = useArtColors();
  const reduceMotion = useReducedMotion();

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-blush-100 blur-3xl dark:opacity-20"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <Eyebrow>Free, no account</Eyebrow>
            <h1 className="mt-3 font-display text-[2.6rem] leading-[1.05] text-ink sm:text-6xl">
              Send someone flowers
              <span className="block text-accent">that never wilt.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
              Build a bouquet petal by petal, write the note you would have written on the
              little card, and send it as a link. It takes about a minute and costs nothing.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#builder" className="inline-flex">
                <span className="inline-flex items-center justify-center gap-2 rounded-pill bg-accent px-7 py-3.5 font-semibold text-white shadow-petal transition-[filter] hover:brightness-110 dark:text-plum-900">
                  Start building
                </span>
              </a>
              <ButtonLink to="/garden" variant="secondary" size="lg">
                See the flowers
              </ButtonLink>
            </div>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-sm"
          >
            <div className="overflow-hidden rounded-card border border-line bg-surface shadow-petal-lg">
              <BouquetCanvas
                scene={HERO_SCENE}
                paper={paper}
                ink={ink}
                className="aspect-square w-full"
                title={`An example bouquet made with ${APP_NAME}`}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* The builder itself */}
      <section id="builder" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <Eyebrow>Make one now</Eyebrow>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
            Your bouquet starts here
          </h2>
        </div>
        <Builder />
      </section>

      <Divider className="my-10" />

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-center font-display text-3xl text-ink sm:text-4xl">How it works</h2>
        <ol className="mt-9 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-card border border-line bg-surface p-6 shadow-petal"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-wash font-display text-lg font-bold text-accent-ink">
                {index + 1}
              </span>
              <h3 className="mt-4 font-display text-xl text-ink">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Occasions */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Not sure where to start?</h2>
        <p className="mt-2 text-ink-soft">
          These load a ready-made mix you can change however you like.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {OCCASIONS.map((occasion) => (
            <li key={occasion.slug}>
              <Link
                to={`/occasion/${occasion.slug}`}
                className="group block h-full rounded-card border border-line bg-surface p-6 shadow-petal transition-colors hover:border-accent"
              >
                <h3 className="font-display text-2xl text-ink group-hover:text-accent-ink">
                  {occasion.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{occasion.blurb}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-accent-ink">
                  Start with this mix &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="text-center font-display text-3xl text-ink sm:text-4xl">
          Questions, answered
        </h2>
        <div className="mt-8">
          <Faq />
        </div>
      </section>
    </Layout>
  );
}
