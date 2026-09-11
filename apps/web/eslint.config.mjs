import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

/**
 * Flat config for the web app, replacing the former .eslintrc.json.
 *
 * eslint-config-next 16 exports a flat config array directly, so it is spread
 * rather than referenced through `extends`. This file shadows the monorepo
 * root config for anything under apps/web, matching the old `root: true`.
 */
const config = [
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },

  ...nextCoreWebVitals,

  // eslint-config-next applies its own parser (next/dist/compiled/babel/eslint-parser)
  // to plain JS. That parser returns a scope manager without addGlobals, which
  // ESLint 10 calls whenever globals are declared — and Next declares ~1174 of
  // them — so linting any .js/.mjs file aborts the run. TypeScript files are
  // unaffected because they go through @typescript-eslint/parser already.
  // Parse JS with that same parser, which is ESLint 10-ready. Revisit once
  // eslint-config-next supports ESLint 10.
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { parser: tseslint.parser },
  },

  // eslint-config-next sets settings.react.version to 'detect'. That detection
  // path calls context.getFilename(), which ESLint 10 removed, and it throws
  // while loading react/display-name, aborting the entire run. Pin the version
  // to bypass detection. Keep in step with the react version in package.json.
  {
    settings: {
      react: { version: '19.1.4' },
    },
  },

  // eslint-plugin-react-hooks 7 (pulled in by eslint-config-next) turns on the
  // React Compiler rule set, which flags pre-existing findings across the app.
  // They are real signals, but burning them down is application refactoring,
  // not part of the lint toolchain upgrade — so they report as warnings for
  // now and CI stays honest about actual errors. Promote these back to 'error'
  // as each is cleared. Kept in step with the monorepo root config.
  // See docs/plans/active/react-compiler-lint-cleanup.md.
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
];

export default config;
