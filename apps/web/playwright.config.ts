import { defineConfig, devices } from '@playwright/test';

/** Stable rendering context for screenshot projects. */
const VISUAL_CONTEXT = {
  locale: 'en-US',
  timezoneId: 'UTC',
  colorScheme: 'light' as const,
};

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  // Baselines are per project (desktop/phone) and Linux-only; see
  // docs/guides/setup-and-testing.md → "Visual regression and accessibility tests".
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testDir: './e2e/tests',
      testIgnore: '**/phone/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'phone',
      testDir: './e2e/tests/phone',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'visual-desktop',
      testDir: './e2e/visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, ...VISUAL_CONTEXT },
    },
    {
      name: 'visual-phone',
      testDir: './e2e/visual',
      use: { ...devices['Pixel 7'], ...VISUAL_CONTEXT },
    },
  ],

  webServer: {
    command: 'next build && next start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    cwd: __dirname,
  },
});
