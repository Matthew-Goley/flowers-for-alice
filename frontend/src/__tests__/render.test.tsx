/**
 * Render smoke tests.
 *
 * These do not assert on styling; they assert that every route actually
 * renders without throwing, and that the copy and controls a user needs are
 * present in the output. That catches the whole class of mistakes that a type
 * checker cannot see: a bad hook call, a missing provider, an undefined read
 * inside a map.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import App from '../App';
import BouquetCanvas from '../components/BouquetCanvas';
import { FLOWER_LIST } from '../components/flowers';
import { STORAGE_KEYS } from '../config';
import { arrangeBouquet, type Stem } from '../lib/arrange';
import { buildLetterBouquet } from '../lib/letters';
import { INK_LIGHT, PAPER_LIGHT } from '../components/flowers/flowerGeometry';
import { WRAP_STYLES, type GreeneryType } from '../types/bouquet';

/**
 * Render the real router at a given URL, so route matching and the params
 * each page reads are exercised rather than stubbed.
 */
function render(route: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

const STEMS: Stem[] = [
  { type: 'rose', color: '#cf6382' },
  { type: 'peony', color: '#f3bccb' },
  { type: 'daisy', color: '#fbf3e7' },
  { type: 'tulip', color: '#e07a5f' },
  { type: 'lily', color: '#fbf3e7' },
  { type: 'anemone', color: '#8fb3d9' },
  { type: 'dahlia', color: '#9f7bc0' },
];

describe('pages', () => {
  afterEach(() => sessionStorage.clear());

  it('renders the home page with only the menu while the bouquet loads', () => {
    // Effects do not run during static rendering, so this is the pre-fetch UI:
    // no lone flower flashing up before a bouquet arrives.
    const html = render('/');
    expect(html).toContain('aria-label="Open menu"');
    expect(html).not.toContain('A single rose');
  });

  it('sends /create home without an accepted code', () => {
    const html = render('/create');
    expect(html).not.toContain('Choose flowers');
  });

  it('renders the builder on /create once the code is accepted', () => {
    sessionStorage.setItem(STORAGE_KEYS.code, '520');
    const html = render('/create');
    expect(html).toContain('Choose flowers');
    expect(html).toContain('0 / 6-10');
  });

  it('carries no product branding', () => {
    sessionStorage.setItem(STORAGE_KEYS.code, '520');
    for (const route of ['/', '/create']) {
      expect(render(route)).not.toMatch(/flowers for alice|petal post/i);
    }
  });
});

describe('BouquetCanvas', () => {
  const scene = {
    mode: 'bouquet' as const,
    flowers: arrangeBouquet(STEMS, 42),
    greenery: 'eucalyptus' as const,
    wrap: 'kraft' as const,
    ribbon: '#e4a0b7',
    mono: false,
  };

  it('draws one group per bloom', () => {
    const html = renderToStaticMarkup(
      <BouquetCanvas scene={scene} paper={PAPER_LIGHT} ink={INK_LIGHT} title="test" />,
    );
    expect(html).toContain('<svg');
    expect(html).toContain('aria-label="test"');
    // Seven stems, each with a stem path and a transform group.
    expect(html.match(/<g transform="translate\(/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
  });

  it('honours visibleCount for the staged reveal', () => {
    const none = renderToStaticMarkup(
      <BouquetCanvas scene={scene} paper={PAPER_LIGHT} ink={INK_LIGHT} visibleCount={0} />,
    );
    const all = renderToStaticMarkup(
      <BouquetCanvas scene={scene} paper={PAPER_LIGHT} ink={INK_LIGHT} />,
    );
    expect(none.length).toBeLessThan(all.length);
  });

  it('hides the contents when sealed', () => {
    const sealed = renderToStaticMarkup(
      <BouquetCanvas scene={scene} paper={PAPER_LIGHT} ink={INK_LIGHT} sealed />,
    );
    const open = renderToStaticMarkup(
      <BouquetCanvas scene={scene} paper={PAPER_LIGHT} ink={INK_LIGHT} />,
    );
    expect(sealed.length).toBeLessThan(open.length);
  });

  it('renders every wrap and greenery combination', () => {
    const greeneries: GreeneryType[] = ['none', 'eucalyptus', 'fern', 'babys-breath'];
    for (const wrap of WRAP_STYLES) {
      for (const greenery of greeneries) {
        const html = renderToStaticMarkup(
          <BouquetCanvas
            scene={{ ...scene, wrap, greenery }}
            paper={PAPER_LIGHT}
            ink={INK_LIGHT}
          />,
        );
        expect(html).toContain('<svg');
      }
    }
  });

  it('renders every flower type', () => {
    for (const flower of FLOWER_LIST) {
      const html = renderToStaticMarkup(
        <BouquetCanvas
          scene={{
            ...scene,
            flowers: arrangeBouquet(
              Array.from({ length: 6 }, () => ({
                type: flower.type,
                color: flower.defaultColor,
              })),
              1,
            ),
          }}
          paper={PAPER_LIGHT}
          ink={INK_LIGHT}
        />,
      );
      expect(html).toContain('<svg');
    }
  });

  it('renders mono art with an opaque paper fill rather than none', () => {
    const html = renderToStaticMarkup(
      <BouquetCanvas scene={{ ...scene, mono: true }} paper={PAPER_LIGHT} ink={INK_LIGHT} />,
    );
    // The occluding fill is what stops layered line art turning into a mesh.
    expect(html).toContain(`fill="${PAPER_LIGHT}"`);
    // And the ink is inlined, so the exported PNG still has its lines.
    expect(html).toContain(INK_LIGHT);
  });

  it('renders a letter bouquet without a sleeve', () => {
    const letters = buildLetterBouquet({
      text: 'HI',
      palette: ['#cf6382'],
      types: ['daisy'],
      seed: 3,
    });
    const html = renderToStaticMarkup(
      <BouquetCanvas
        scene={{ ...scene, mode: 'letters', flowers: letters }}
        paper={PAPER_LIGHT}
        ink={INK_LIGHT}
      />,
    );
    expect(html).toContain('<svg');
    expect(letters.length).toBeGreaterThan(10);
  });
});
