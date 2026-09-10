import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    // Vitest defaults to 5s. Several page tests legitimately take 6-7s here
    // (jsdom + Mantine + a full page render), so the default made the suite
    // flaky under load — which tests tipped over varied run to run. Mirrors
    // the CI-aware pattern already used in apps/mobile/jest.config.js, with
    // more local headroom because these tests sit close to the old limit.
    testTimeout: process.env.CI ? 30000 : 15000,
    hookTimeout: process.env.CI ? 30000 : 15000,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 5,
        functions: 20,
        branches: 30,
        statements: 5,
      },
    },
  },
});
