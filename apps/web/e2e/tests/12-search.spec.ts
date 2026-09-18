import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { MOCK_POSTS } from '../fixtures/mock-data';
import { mockSearchRoutes } from '../helpers/search-mock';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';

test.describe('Global search', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockSearchRoutes(page);
    await page.goto('/feed');
  });

  test('suggests results while typing and opens one', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
    const option = page.getByRole('option', { name: new RegExp(MOCK_POSTS[0].title) });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
    await expect(page).toHaveURL(new RegExp(`/posts/${MOCK_POSTS[0].id}$`));
  });

  test('"more posts" opens the Posts tab', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
    await page.getByRole('option', { name: /3 more posts/ }).click();
    await expect(page).toHaveURL(/\/search\?q=thapa&tab=posts/);
    await expect(page.getByRole('tab', { name: /Posts/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('Enter opens all results and the scope toggle updates the URL', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Search Nepally' });
    await input.fill('thapa');
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 10_000 });
    await input.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=thapa$/);
    await expect(page.getByRole('heading', { name: 'Results for “thapa”' })).toBeVisible();
    await page.getByText('All metros', { exact: true }).click();
    await expect(page).toHaveURL(/scope=all/);
  });
});
