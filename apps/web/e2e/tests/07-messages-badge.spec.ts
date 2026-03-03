import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

test.describe('Messages badge', () => {
  test('refreshes unread badge when page becomes active', async ({ page }) => {
    let unreadRows: Array<{ unread_count: number }> = [];

    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);

    await page.unroute('**/rest/v1/conversation_participants**');
    await page.route('**/rest/v1/conversation_participants**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(unreadRows),
      });
    });

    await page.goto('/feed');

    const messagesLink = page.getByLabel('Messages');
    await expect(messagesLink).toBeVisible({ timeout: 10_000 });
    await expect(messagesLink.locator('span')).toHaveCount(0);

    unreadRows = [{ unread_count: 3 }];

    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(messagesLink.locator('span')).toHaveText('3');

    unreadRows = [];

    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(messagesLink.locator('span')).toHaveCount(0);
  });
});
