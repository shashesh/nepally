/**
 * The marketplace's keyboard and layout guarantees, from the keyboard walks of
 * PR 8a (browse and detail) and PR 8b (my listings and the promote wizard).
 * Kept rather than run once: the walk caught the save button dropping focus to
 * <body> while its write was in flight, and the 375px checks are the regression
 * guard for the header overflow recon 9 found.
 */
import { test, expect, type Page } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import {
  MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE,
  MOCK_MARKETPLACE_LISTING_OWN_ACTIVE,
} from '../fixtures/mock-data';

async function activeDescription(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      tag: el.tagName,
      role: el.getAttribute('role'),
      name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
    };
  });
}

test.describe('Marketplace keyboard and layout', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('the marketplace header does not overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/marketplace');
    await expect(page.getByRole('heading', { name: /^marketplace$/i })).toBeVisible({ timeout: 10_000 });

    const { docWidth, viewport } = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    // recon 9: this was 442px against a 375px viewport.
    expect(docWidth).toBeLessThanOrEqual(viewport);
  });

  test('the filter bar is fully reachable by keyboard', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByRole('heading', { name: /^marketplace$/i })).toBeVisible({ timeout: 10_000 });

    const search = page.getByRole('searchbox', { name: /search listings/i });
    await search.focus();
    await search.fill('momo');
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();

    // The clear button is the next stop after the field.
    await page.keyboard.press('Tab');
    expect((await activeDescription(page))?.name).toMatch(/clear search/i);

    await page.keyboard.press('Enter');
    await expect(search).toHaveValue('');

    // Both selects take focus and respond to the keyboard.
    await page.getByRole('combobox', { name: /^sort$/i }).focus();
    expect((await activeDescription(page))?.tag).toBe('SELECT');
  });

  test('each listing card is one link stop, and the strip arrow takes focus', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByRole('region', { name: /recently added/i })).toBeVisible({ timeout: 10_000 });

    const grid = page.getByRole('region', { name: /all listings/i });
    const cards = grid.getByRole('listitem');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // One link per card: the title. Nothing else inside is focusable.
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      expect(await card.getByRole('link').count()).toBe(1);
      expect(await card.getByRole('button').count()).toBe(0);
    }

    const arrow = page.getByRole('button', { name: /scroll .* right/i }).first();
    if (await arrow.count()) {
      await arrow.focus();
      const outline = await arrow.evaluate((el) => {
        const s = getComputedStyle(el);
        return { outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle, boxShadow: s.boxShadow };
      });
      // Mantine's focus ring is an outline; the old raw button had none.
      expect(
        outline.outlineStyle !== 'none' || outline.boxShadow !== 'none'
      ).toBe(true);
    }
  });

  test('listing detail: breadcrumb, carousel and actions are reachable', async ({ page }) => {
    await page.goto(`/marketplace/listing/${MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.id}`);
    await expect(
      page.getByRole('heading', { level: 1, name: MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.title })
    ).toBeVisible({ timeout: 10_000 });

    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toBeVisible();
    // Scoped to the landmark: the side rail also links "Marketplace".
    await breadcrumb.getByRole('link', { name: 'Marketplace' }).focus();
    expect((await activeDescription(page))?.tag).toBe('A');

    const save = page.getByRole('button', { name: /save listing/i });
    await save.focus();
    await expect(save).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(save).toHaveAttribute('aria-pressed', 'true');
    // Focus must stay on the control the member just used.
    expect((await activeDescription(page))?.name).toMatch(/save listing/i);
  });

  test('listing detail at 375px does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/marketplace/listing/${MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.id}`);
    await expect(
      page.getByRole('heading', { level: 1, name: MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.title })
    ).toBeVisible({ timeout: 10_000 });

    const { docWidth, viewport } = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(docWidth).toBeLessThanOrEqual(viewport);
  });

  test('my listings: a row menu opens from the keyboard and Escape returns to it', async ({ page }) => {
    await page.goto('/marketplace/my-listings');
    const trigger = page.getByRole('button', { name: `Actions for ${MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title}` });
    await expect(trigger).toBeVisible({ timeout: 10_000 });

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    // Mantine moves focus into the menu on a timer after it mounts; an arrow
    // key pressed before then goes to the trigger instead.
    await expect(page.locator('[role="menu"]:focus-within')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    expect((await activeDescription(page))?.role).toBe('menuitem');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('my listings at 375px does not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/marketplace/my-listings');
    await expect(page.getByRole('link', { name: MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title })).toBeVisible({
      timeout: 10_000,
    });

    const { docWidth, viewport } = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(docWidth).toBeLessThanOrEqual(viewport);
  });

  test('promote wizard at 375px does not overflow, on any step', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/marketplace/listing/promote/${MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.id}`);
    await expect(page.getByRole('radiogroup', { name: 'Promotion type' })).toBeVisible({ timeout: 10_000 });

    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.getByRole('radio', { name: 'Sticky Business' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Set duration' })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Review and pay' })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
