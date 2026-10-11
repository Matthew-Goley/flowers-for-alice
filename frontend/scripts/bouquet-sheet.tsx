/**
 * Dev utility: render a few complete bouquets to one sheet, to check the
 * composition of greenery, sleeve and ribbon together.
 *
 *   npx tsx scripts/bouquet-sheet.tsx [out.svg]
 *
 * Not part of the build.
 */

import { writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BouquetCanvas, { type BouquetScene } from '../src/components/BouquetCanvas';
import {
  INK_DARK,
  INK_LIGHT,
  PAPER_DARK,
  PAPER_LIGHT,
} from '../src/components/flowers/flowerGeometry';
import { arrangeBouquet, type Stem } from '../src/lib/arrange';
import { buildLetterBouquet } from '../src/lib/letters';
import type { FlowerType } from '../src/types/bouquet';

const PICKS: FlowerType[] = [
  'rose',
  'peony',
  'ranunculus',
  'anemone',
  'daisy',
  'tulip',
  'dahlia',
  'lily',
];
const COLORS = [
  '#cf6382',
  '#f3bccb',
  '#f0b27a',
  '#8fb3d9',
  '#fbf3e7',
  '#e07a5f',
  '#9f7bc0',
  '#fbf3e7',
];

function stems(count: number): Stem[] {
  return Array.from({ length: count }, (_, i) => ({
    type: PICKS[i % PICKS.length] ?? 'rose',
    color: COLORS[i % COLORS.length] ?? '#cf6382',
  }));
}

interface Sample {
  label: string;
  scene: BouquetScene;
  paper: string;
  ink: string;
  sealed?: boolean;
}

const samples: Sample[] = [
  {
    label: 'Colour, eucalyptus, kraft',
    paper: PAPER_LIGHT,
    ink: INK_LIGHT,
    scene: {
      mode: 'bouquet',
      flowers: arrangeBouquet(stems(9), 12),
      greenery: 'eucalyptus',
      wrap: 'kraft',
      ribbon: '#e4a0b7',
      mono: false,
    },
  },
  {
    label: 'Colour, fern, gingham',
    paper: PAPER_LIGHT,
    ink: INK_LIGHT,
    scene: {
      mode: 'bouquet',
      flowers: arrangeBouquet(stems(7), 44),
      greenery: 'fern',
      wrap: 'gingham',
      ribbon: '#7d9c70',
      mono: false,
    },
  },
  {
    label: "Colour, baby's breath, lace",
    paper: PAPER_LIGHT,
    ink: INK_LIGHT,
    scene: {
      mode: 'bouquet',
      flowers: arrangeBouquet(stems(10), 5),
      greenery: 'babys-breath',
      wrap: 'lace',
      ribbon: '#cf6382',
      mono: false,
    },
  },
  {
    label: 'Mono, fern, vellum',
    paper: PAPER_LIGHT,
    ink: INK_LIGHT,
    scene: {
      mode: 'bouquet',
      flowers: arrangeBouquet(stems(8), 31),
      greenery: 'fern',
      wrap: 'vellum',
      ribbon: '#cdc3bb',
      mono: true,
    },
  },
  {
    label: 'Dark theme, linen',
    paper: PAPER_DARK,
    ink: INK_DARK,
    scene: {
      mode: 'bouquet',
      flowers: arrangeBouquet(stems(8), 77),
      greenery: 'eucalyptus',
      wrap: 'linen',
      ribbon: '#e8b14a',
      mono: false,
    },
  },
  {
    label: 'Sealed (not yet opened)',
    paper: PAPER_LIGHT,
    ink: INK_LIGHT,
    sealed: true,
    scene: {
      mode: 'bouquet',
      flowers: [],
      greenery: 'none',
      wrap: 'kraft',
      ribbon: '#e4a0b7',
      mono: false,
    },
  },
  {
    label: 'Letters: HI MUM',
    paper: PAPER_LIGHT,
    ink: INK_LIGHT,
    scene: {
      mode: 'letters',
      flowers: buildLetterBouquet({
        text: 'HI MUM',
        palette: ['#cf6382', '#f3bccb', '#e8b14a'],
        types: ['daisy', 'rose', 'zinnia'],
        seed: 4,
      }),
      greenery: 'none',
      wrap: 'kraft',
      ribbon: '#e4a0b7',
      mono: false,
    },
  },
  {
    label: 'Letters: LOVE, mono',
    paper: PAPER_LIGHT,
    ink: INK_LIGHT,
    scene: {
      mode: 'letters',
      flowers: buildLetterBouquet({
        text: 'LOVE',
        palette: ['#cf6382'],
        types: ['ranunculus'],
        seed: 8,
      }),
      greenery: 'none',
      wrap: 'kraft',
      ribbon: '#e4a0b7',
      mono: true,
    },
  },
];

const CELL = 260;
const LABEL = 30;
const COLS = 4;
const rows = Math.ceil(samples.length / COLS);
const width = 20 * 2 + COLS * CELL;
const height = 20 * 2 + rows * (CELL + LABEL);

const tiles = samples.map((sample, i) => {
  const x = 20 + (i % COLS) * CELL;
  const y = 20 + Math.floor(i / COLS) * (CELL + LABEL);
  const art = renderToStaticMarkup(
    createElement(BouquetCanvas, {
      scene: sample.scene,
      paper: sample.paper,
      ink: sample.ink,
      sealed: sample.sealed ?? false,
      title: sample.label,
    }),
  ).replace('<svg', `<svg width="${CELL - 14}" height="${CELL - 14}"`);

  return `<g transform="translate(${x} ${y})">
    ${art}
    <text x="${(CELL - 14) / 2}" y="${CELL + 6}" text-anchor="middle"
      font-family="system-ui, sans-serif" font-size="13" fill="#3f3038">${sample.label}</text>
  </g>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#fffaf6"/>
${tiles.join('\n')}
</svg>`;

const target = process.argv[2] ?? 'bouquet-sheet.svg';
writeFileSync(target, svg, 'utf-8');
console.log(`wrote ${target} (${samples.length} bouquets)`);
