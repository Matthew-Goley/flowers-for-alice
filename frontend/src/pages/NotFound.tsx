import Layout from '../components/Layout';
import { ButtonLink } from '../components/ui';
import { FlowerGlyph, FLOWERS } from '../components/flowers';
import { useArtColors } from '../lib/theme';

export default function NotFound() {
  const { paper } = useArtColors();
  const Art = FLOWERS.anemone.art;

  return (
    <Layout>
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <FlowerGlyph className="h-28 w-28 opacity-80">
          <Art color="#c4a7d8" mono={false} paper={paper} />
        </FlowerGlyph>
        <h1 className="mt-6 font-display text-4xl text-ink sm:text-5xl">
          This page never bloomed.
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          The address does not match anything here. If you were sent a bouquet link, check it
          for a stray character.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/" size="lg">
            Build a bouquet
          </ButtonLink>
          <ButtonLink to="/garden" variant="secondary" size="lg">
            Visit the garden
          </ButtonLink>
        </div>
      </section>
    </Layout>
  );
}
