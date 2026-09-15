import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn, mockUnhandledRest } from '../helpers/supabase-mock';

/** Frozen "now" so relative times and dates render identically on every run. */
export const VISUAL_NOW = new Date('2026-09-14T12:00:00Z');

/** Screenshot baselines are generated on Linux (Docker/CI) only. */
export function isVisualHostSupported(): boolean {
  return process.platform === 'linux' || process.env.VISUAL_FORCE === '1';
}

/** Smoke runs check that every page reaches its ready state, without screenshots. */
export const isSmokeRun = process.env.VISUAL_SMOKE === '1';

const BASELINE_PATH = path.join(__dirname, 'a11y-baseline.json');
type A11yBaseline = Record<string, string[]>;

function readBaseline(): A11yBaseline {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as A11yBaseline;
}

function writeBaseline(baseline: A11yBaseline): void {
  const sorted = Object.fromEntries(Object.entries(baseline).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

export async function prepareVisualPage(page: Page, options: { signedIn: boolean }): Promise<void> {
  await page.clock.setFixedTime(VISUAL_NOW);
  if (options.signedIn) {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  } else {
    await mockUnhandledRest(page);
  }
}

/** Waits for web fonts and in-flight images so the screenshot is stable. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const pending = Array.from(document.images).filter((img) => !img.complete);
    await Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          })
      )
    );
  });
}

/** Regions whose text depends on the wall clock or live counters. */
export function dynamicMasks(page: Page): Locator[] {
  return [page.getByText(/^(just now|\d+[mhdw] ago)$/)];
}

/**
 * Fails on serious/critical axe violations that are not already recorded for
 * `key` in a11y-baseline.json. With A11Y_BASELINE_WRITE=1 it records the
 * current violations instead (run with --workers=1).
 */
export async function expectNoNewA11yViolations(page: Page, key: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = Array.from(
    new Set(
      results.violations
        .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
        .map((violation) => violation.id)
    )
  ).sort();

  const baseline = readBaseline();
  if (process.env.A11Y_BASELINE_WRITE === '1') {
    if (blocking.length > 0) baseline[key] = blocking;
    else delete baseline[key];
    writeBaseline(baseline);
    return;
  }

  const known = new Set(baseline[key] ?? []);
  const unexpected = blocking.filter((id) => !known.has(id));
  expect(unexpected, `New serious/critical axe violations on ${key}: ${unexpected.join(', ')}`).toEqual([]);
}
