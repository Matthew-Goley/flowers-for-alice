// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,

  // Typed linting applies to the TypeScript sources only. eslint.config.js
  // itself is plain JS and is not in any tsconfig, so the type-aware rules
  // would fail to load for it.
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The brief asks for no `any`, so make it an error rather than a warning.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Empty catch blocks are used on purpose around storage and clipboard
      // access, where failure is expected and not actionable.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  {
    // Dev scripts run in Node and write files; the browser globals do not apply.
    files: ['scripts/**/*.{ts,tsx}', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  prettier,
);
