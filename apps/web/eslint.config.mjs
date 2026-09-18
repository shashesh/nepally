import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
import { RAW_ELEMENT_ALLOWLIST } from './eslint/raw-element-allowlist.mjs';
import { escapeGlobLiteral } from './eslint/escape-glob.mjs';

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
      react: { version: '19.2.3' },
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

  // Web UI overhaul (spec §4.2): interactive primitives come from Mantine.
  // components/ui/ may wrap raw elements. Files not migrated yet are listed in
  // eslint/raw-element-allowlist.mjs, which shrinks with each area PR.
  //
  // Next.js dynamic route segments (src/pages/**/[id].page.tsx) put literal
  // square brackets in the filename. ESLint's `ignores` patterns are globs, and
  // an unescaped `[id]` is a bracket expression matching a single 'i' or 'd'
  // character, not the four literal characters — so allowlisted dynamic routes
  // would silently fail to be ignored. Escape `[` and `]` so each allowlist
  // entry matches the literal path.
  {
    files: ['src/**/*.tsx'],
    ignores: [
      'src/components/ui/**',
      'src/**/*.test.tsx',
      ...(process.env.RAW_ELEMENT_ALLOWLIST_DISABLED === '1'
        ? []
        : RAW_ELEMENT_ALLOWLIST.map(escapeGlobLiteral)),
    ],
    rules: {
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            { element: 'button', message: 'Use Mantine Button, UnstyledButton or ActionIcon (or a components/ui primitive).' },
            { element: 'input', message: 'Use a Mantine input component.' },
            { element: 'select', message: 'Use Mantine Select or NativeSelect.' },
            { element: 'textarea', message: 'Use Mantine Textarea.' },
          ],
        },
      ],
    },
  },
];

export default config;
