import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.preview/**', 'playwright-report/**', 'test-results/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // An unused argument is often deliberate in a callback signature; a
      // leading underscore marks that intent explicitly.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // The codebase catches errors it deliberately does not inspect (feature
      // detection, optional decode paths), which is a legitimate empty block.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Node-side files: build scripts and the serverless functions. The scripts
  // also pass callbacks to page.evaluate(), whose bodies execute in the browser,
  // so both global sets apply.
  {
    files: ['scripts/**/*.mjs', 'api/**/*.ts', '*.config.{ts,js}', 'playwright.config.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Tests may assert on non-null values the compiler cannot prove.
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
