/// <reference types="vite/client" />

/**
 * Injected by `define` in vite.config.ts from /brand.json at the repo root.
 * Edit brand.json to rename the product; restart the dev server to pick it up.
 */
declare const __BRAND__: {
  readonly name: string;
  readonly tagline: string;
  readonly domain: string;
  readonly supportEmail: string;
};
