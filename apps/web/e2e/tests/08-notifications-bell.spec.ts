import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

type MockNotification = {
  id: string;
  user_id: string;
  type: 'message' | 'post_response';
  title: string;
  body: string;
  read: boolean;
  sent_at: string;
  data: Record<string, string>;
};

function filterNotifications(rows: MockNotification[], requestUrl: string): MockNotification[] {
  const params = new URL(requestUrl).searchParams;
  let filtered = [...rows];

  if (params.get('type') === 'neq.message') {
    filtered = filtered.filter((row) => row.type !== 'message');
  }

  if (params.get('read') === 'eq.false') {
    filtered = filtered.filter((row) => row.read === false);
  }

  return filtered;
}

test.describe('Notification bell excludes chat notifications', () => {
  test('requests non-message notifications and renders only non-chat items', async ({ page }) => {
    const notifications: MockNotification[] = [
      {
        id: 'notif-message-001',
        user_id: 'test-user-123',
        type: 'message',
        title: 'New chat message',
        body: 'You received a new chat message',
        read: false,
        sent_at: new Date().toISOString(),
        data: { conversation_id: 'conv-1' },
      },
      {
        id: 'notif-post-001',
        user_id: 'test-user-123',
        type: 'post_response',
        title: 'Post reply test',
        body: 'Someone replied to your post',
        read: false,
        sent_at: new Date().toISOString(),
        data: { post_id: 'post-1' },
      },
    ];

    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);

    await page.route('**/rest/v1/notifications**', async (route) => {
      const filtered = filterNotifications(notifications, route.request().url());

      if (route.request().method() === 'HEAD') {
        const count = filtered.length;
        await route.fulfill({
          status: 200,
          headers: {
            ...JSON_HEADERS,
            'content-range': count > 0 ? `0-${count - 1}/${count}` : '*/0',
            'range-unit': 'items',
          },
          body: '',
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(filtered),
      });
    });

    const filteredRequestPromise = page.waitForRequest(
      (request) =>
        request.url().includes('/rest/v1/notifications') &&
        request.url().includes('type=neq.message')
    );

    await page.goto('/feed');

    await filteredRequestPromise;

    const notificationBell = page.getByRole('button', { name: /Notifications/i });
    await expect(notificationBell).toBeVisible();

    await notificationBell.click();

    await expect(page.getByText('Post reply test')).toBeVisible();
    await expect(page.getByText('New chat message')).toHaveCount(0);
  });
});
