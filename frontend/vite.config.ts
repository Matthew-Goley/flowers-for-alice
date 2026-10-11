/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The product name lives in /brand.json at the repo root so a rename is a
 * one-file edit. It is inlined at config time rather than imported from src,
 * which keeps it out of tsconfig's rootDir and avoids a second copy.
 * Changing brand.json needs a dev-server restart to take effect.
 */
const brand: unknown = JSON.parse(
  readFileSync(new URL('../brand.json', import.meta.url), 'utf-8'),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BRAND__: JSON.stringify(brand),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
