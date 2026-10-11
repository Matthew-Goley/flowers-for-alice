/**
 * Dev utility: render every flower to a single contact sheet so the artwork
 * can be reviewed side by side, in colour and in mono, without clicking
 * through the app.
 *
 *   npx jiti scripts/art-sheet.tsx            (writes art-sheet.svg)
 *   npx jiti scripts/art-sheet.tsx out.svg
 *
 * Not part of the build. Nothing in src imports it.
 */

import { writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FLOWER_LIST } from '../src/components/flowers';

const CELL = 150;
const LABEL = 26;
const COLS = 6;
const INK = '#3f3038';
const CREAM = '#fffaf6';

function section(title: string, mono: boolean, yStart: number): string {
  const rows = Math.ceil(FLOWER_LIST.length / COLS);
  const parts: string[] = [
    `<text x="16" y="${yStart - 14}" font-family="Georgia, serif" font-size="22" fill="${INK}">${title}</text>`,
  ];

  FLOWER_LIST.forEach((flower, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = 16 + col * CELL;
    const y = yStart + row * (CELL + LABEL);
    const art = renderToStaticMarkup(
      createElement(flower.art, { color: flower.defaultColor, mono }),
    );

    parts.push(
      `<g transform="translate(${x} ${y})" style="color:${INK}" stroke-linejoin="round" stroke-linecap="round">`,
      `<rect width="${CELL - 10}" height="${CELL - 10}" rx="16" fill="${mono ? '#ffffff' : '#fffdfb'}" stroke="#f0e2d8"/>`,
      `<g transform="translate(${(CELL - 10) / 2 - 60} ${(CELL - 10) / 2 - 60}) scale(1.2)">${art}</g>`,
      `<text x="${(CELL - 10) / 2}" y="${CELL + 8}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="${INK}">${flower.name}</text>`,
      `</g>`,
    );
  });

  return parts.join('\n') + `\n<!-- rows: ${rows} -->`;
}

const rows = Math.ceil(FLOWER_LIST.length / COLS);
const sectionHeight = rows * (CELL + LABEL) + 46;
const width = 16 * 2 + COLS * CELL;
const height = sectionHeight * 2 + 30;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="${CREAM}"/>
${section('Colour mode', false, 60)}
${section('Mono mode', true, 60 + sectionHeight)}
</svg>`;

const target = process.argv[2] ?? 'art-sheet.svg';
writeFileSync(target, svg, 'utf-8');
console.log(`wrote ${target} (${width}x${height}, ${FLOWER_LIST.length} flowers x 2 modes)`);
