import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Flat config for the monorepo root, replacing the former .eslintrc.json.
 *
 * ESLint resolves a flat config by walking up from the working directory, so
 * this file also serves apps/mobile and packages/shared, neither of which has
 * its own config. apps/web has its own eslint.config.mjs and does not inherit
 * from here — the same isolation the old `root: true` provided.
 */
export default tseslint.config(
  {
    // Flat config has no .eslintignore. Build output and dependencies are
    // excluded here instead; patterns mirror .gitignore.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.next/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/*.tsbuildinfo',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  reactHooks.configs.flat.recommended,

  {
    // Listing the TypeScript extensions here is what replaces the `--ext`
    // flag the lint scripts used to pass; flat config discovers files by the
    // `files` patterns its config objects declare.
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      // Pinned rather than 'detect': eslint-plugin-react's version detection
      // calls context.getFilename(), which ESLint 10 removed, and crashes the
      // whole run. Keep in step with the react version in package.json.
      react: { version: '19.1.4' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  // Build config and Node tooling scripts are CommonJS. Scoped by pattern
  // rather than by extension because some .js files here are ESM
  // (apps/mobile/index.js) or browser workers (apps/web/public/sw.js).
  {
    files: [
      '**/*.cjs',
      '**/*.config.js',
      '**/scripts/**/*.js',
      'apps/mobile/create-placeholder-assets.js',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // eslint-plugin-react-hooks 7 turns on the React Compiler rule set, which
  // flags 169 pre-existing findings across mobile and web. They are real
  // signals, but burning them down is application refactoring, not part of
  // the lint toolchain upgrade — so they report as warnings for now and CI
  // stays honest about actual errors. Promote these back to 'error' as each
  // is cleared. See docs/plans/active/react-compiler-lint-cleanup.md.
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },

  // Keep prettier last so it can turn off stylistic rules the configs above enable.
  prettier
);
