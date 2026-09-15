import { expect, test } from '@playwright/test';
import {
  dynamicMasks,
  expectNoNewA11yViolations,
  isSmokeRun,
  isVisualHostSupported,
  prepareVisualPage,
  settle,
} from './helpers';
import { VISUAL_PAGES } from './pages';

test.describe.configure({ mode: 'parallel' });

for (const entry of VISUAL_PAGES) {
  test(`${entry.name} matches its baseline`, async ({ page }, testInfo) => {
    test.skip(
      !isVisualHostSupported(),
      'Visual baselines are Linux-only. Run: npm run test:visual:docker --workspace=apps/web'
    );

    await prepareVisualPage(page, { signedIn: entry.signedIn });
    await entry.setup?.(page);
    await page.goto(entry.path);
    await entry.ready(page);
    await settle(page);

    if (isSmokeRun) return;

    await expect(page).toHaveScreenshot(`${entry.name}.png`, { mask: dynamicMasks(page) });
    await expectNoNewA11yViolations(page, `${testInfo.project.name}:${entry.name}`);
  });
}
