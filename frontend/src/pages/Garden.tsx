/**
 * /garden - the whole catalog, with what each flower is for.
 *
 * Doubles as a reference for the sender and as the page that shows off the
 * artwork, so it carries the colour/line-art toggle and a colour picker.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FlowerGlyph, FLOWER_LIST } from '../components/flowers';
import Layout from '../components/Layout';
import { ButtonLink, Divider, Eyebrow, Switch } from '../components/ui';
import { PETAL_PALETTE } from '../config';
import { useArtColors } from '../lib/theme';
import type { FlowerType } from '../types/bouquet';

export default function Garden() {
  const { paper } = useArtColors();
  const [mono, setMono] = useState(false);
  const [overrides, setOverrides] = useState<Partial<Record<FlowerType, string>>>({});
  const reduceMotion = useReducedMotion();

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6">
        <Eyebrow>The garden</Eyebrow>
        <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
          Twelve flowers, and what people tend to mean by them.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
          Every bloom here was drawn for this site. Tap a petal colour to try it on, or switch
          to line art if you prefer something quieter.
        </p>

        <div className="mt-7 max-w-xs rounded-card border border-line bg-surface p-4">
          <Switch
            label="Line-art mode"
            description="Outlines instead of colour"
            checked={mono}
            onChange={setMono}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FLOWER_LIST.map((flower, index) => {
            const Art = flower.art;
            const color = overrides[flower.type] ?? flower.defaultColor;

            return (
              <motion.li
                key={flower.type}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
                className="flex flex-col rounded-card border border-line bg-surface p-5 shadow-petal"
              >
                <div className="flex items-start gap-4">
                  <FlowerGlyph className="h-24 w-24 shrink-0" title={`${flower.name} flower`}>
                    <Art color={color} mono={mono} paper={paper} />
                  </FlowerGlyph>
                  <div className="min-w-0 pt-1">
                    <h2 className="font-display text-2xl text-ink">{flower.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {flower.meaning}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
                  {PETAL_PALETTE.map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      onClick={() =>
                        setOverrides((prev) => ({ ...prev, [flower.type]: swatch.value }))
                      }
                      aria-label={`Show the ${flower.name} in ${swatch.name}`}
                      aria-pressed={color === swatch.value}
                      title={swatch.name}
                      disabled={mono}
                      className={`h-6 w-6 rounded-full border-2 transition-transform motion-safe:hover:scale-110 disabled:opacity-30 ${
                        color === swatch.value ? 'border-accent' : 'border-line-strong'
                      }`}
                      style={{ backgroundColor: swatch.value }}
                    />
                  ))}
                </div>
              </motion.li>
            );
          })}
        </ul>
      </section>

      <Divider className="my-4" />

      <section className="mx-auto max-w-2xl px-4 pt-10 pb-6 text-center sm:px-6">
        <h2 className="font-display text-3xl text-ink">Ready to pick a few?</h2>
        <p className="mt-3 text-ink-soft">
          Six to ten stems makes a bouquet. It takes about a minute.
        </p>
        <ButtonLink to="/" size="lg" className="mt-6">
          Build a bouquet
        </ButtonLink>
      </section>
    </Layout>
  );
}
