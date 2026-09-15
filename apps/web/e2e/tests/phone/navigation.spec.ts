import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../../fixtures/auth';
import { mockSupabaseLoggedIn } from '../../helpers/supabase-mock';

test.describe('Phone navigation', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('bottom tabs replace the side rail', async ({ page }) => {
    await page.goto('/feed');
    const tabs = page.getByRole('navigation', { name: 'Tabs' });
    await expect(tabs).toBeVisible({ timeout: 10_000 });
    await expect(tabs.getByRole('link')).toHaveCount(5);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
    await expect(tabs.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  test('tabs navigate between sections', async ({ page }) => {
    await page.goto('/feed');
    await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Events' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('topic pills filter the feed', async ({ page }) => {
    await page.goto('/feed');
    await page.getByRole('navigation', { name: 'Topics' }).getByRole('link', { name: 'Housing' }).click();
    await expect(page).toHaveURL(/tags=housing/);
  });

  test('the composer hides the tab bar', async ({ page }) => {
    await page.goto('/posts/create');
    await expect(page.getByRole('heading', { name: /create post/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  });
});
