/**
 * Notifications, their preferences and the moderation queue, end to end over
 * small stateful mocks: reads, deletes and saves change what the next request
 * returns, so the page's own reloads see them.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_POSTS, MOCK_USER_ID, MOCK_USER_PROFILE } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const POST_ID = MOCK_POSTS[0].id;

interface MockNotification {
  id: string;
  user_id: string;
  type: 'post_response' | 'emergency_alert' | 'message';
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  read_at: string | null;
  sent_at: string;
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function wantsObject(route: Route): boolean {
  return (route.request().headers()['accept'] ?? '').includes('application/vnd.pgrst.object+json');
}

function idFilter(url: string): string | null {
  return new URL(url).searchParams.get('id')?.replace(/^eq\./, '') ?? null;
}

async function mockNotifications(page: Page): Promise<MockNotification[]> {
  const rows: MockNotification[] = [
    { id: 'n-1', user_id: MOCK_USER_ID, type: 'post_response', title: 'Sita commented on your post', body: 'Great idea!', data: { post_id: POST_ID }, read: false, read_at: null, sent_at: minutesAgo(5) },
    { id: 'n-2', user_id: MOCK_USER_ID, type: 'post_response', title: 'Ram liked your post', body: '5 people liked it', data: { post_id: POST_ID }, read: false, read_at: null, sent_at: minutesAgo(10) },
    { id: 'n-3', user_id: MOCK_USER_ID, type: 'post_response', title: 'Hari replied', body: 'Thanks', data: { post_id: POST_ID }, read: true, read_at: minutesAgo(20), sent_at: minutesAgo(30) },
    { id: 'n-chat', user_id: MOCK_USER_ID, type: 'message', title: 'New chat message', body: 'Hi', data: { conversation_id: 'c-1' }, read: false, read_at: null, sent_at: minutesAgo(1) },
  ];

  await page.route('**/rest/v1/notifications**', async (route) => {
    const request = route.request();
    const url = request.url();
    const params = new URL(url).searchParams;
    const method = request.method();
    const visible = rows.filter((row) => row.type !== 'message');

    if (method === 'HEAD') {
      const count = visible.filter((row) => !row.read).length;
      await route.fulfill({
        status: 200,
        headers: {
          ...JSON_HEADERS,
          'content-range': count > 0 ? `0-${count - 1}/${count}` : '*/0',
          // Cross-origin: the browser hides content-range from supabase-js
          // unless the response exposes it, and the count reads as zero.
          'access-control-expose-headers': 'content-range',
          'range-unit': 'items',
        },
        body: '',
      });
      return;
    }
    if (method === 'PATCH') {
      const id = idFilter(url);
      for (const row of rows) {
        if (id ? row.id === id : row.type !== 'message' && params.get('read') === 'eq.false') {
          row.read = true;
          row.read_at = new Date().toISOString();
        }
      }
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
      return;
    }
    if (method === 'DELETE') {
      const id = idFilter(url);
      const index = rows.findIndex((row) => row.id === id);
      if (index >= 0) rows.splice(index, 1);
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
      return;
    }
    const newestFirst = [...visible].sort((a, b) => b.sent_at.localeCompare(a.sent_at));
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(newestFirst) });
  });

  return rows;
}

test.describe('Notifications page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockNotifications(page);
  });

  test('lists today’s notifications under a plain heading with the unread count', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('2 unread')).toBeVisible();
    const today = page.getByRole('region', { name: 'Today' });
    await expect(today.getByRole('button', { name: /Sita commented on your post/ })).toBeVisible();
    await expect(page.getByText('New chat message')).toHaveCount(0);
  });

  test('opening a notification goes to its post and marks it read', async ({ page }) => {
    await page.goto('/notifications');
    const read = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('id=eq.n-1'));

    await page.getByRole('button', { name: /Sita commented on your post/ }).click();

    await read;
    await expect(page).toHaveURL(new RegExp(`/posts/${POST_ID}$`));
  });

  test('deleting a row keeps focus in the list', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByRole('button', { name: /Sita commented on your post/ })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Delete notification' }).first().click();

    await expect(page.getByRole('button', { name: /Sita commented on your post/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Ram liked your post/ })).toBeFocused();
    await expect(page.getByText('1 unread')).toBeVisible();
  });

  test('mark all as read clears the count and lands focus on Preferences', async ({ page }) => {
    await page.goto('/notifications');
    const markAll = page.getByRole('button', { name: 'Mark all as read' });
    await expect(markAll).toBeVisible({ timeout: 10_000 });

    await markAll.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('2 unread')).toHaveCount(0);
    await expect(markAll).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Preferences' })).toBeFocused();
  });

  test('keyboard: header actions come before the rows, each row before its Delete', async ({ page }) => {
    await page.goto('/notifications');
    const markAll = page.getByRole('button', { name: 'Mark all as read' });
    await expect(markAll).toBeVisible({ timeout: 10_000 });

    await markAll.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Preferences' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Sita commented on your post/ })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Delete notification' }).first()).toBeFocused();

    // Enter on Delete keeps focus in the list.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Ram liked your post/ })).toBeFocused();
  });
});

async function mockSettings(page: Page, options: { failRead?: boolean } = {}): Promise<Array<Record<string, unknown>>> {
  const saved: Array<Record<string, unknown>> = [];
  await page.route('**/rest/v1/user_settings**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      if (options.failRead) {
        await route.fulfill({ status: 500, headers: JSON_HEADERS, body: JSON.stringify({ message: 'boom', code: 'XX000' }) });
        return;
      }
      const row = {
        user_id: MOCK_USER_ID,
        email_notifications: true,
        push_notifications: true,
        emergency_alerts: true,
        metro_area_alerts: true,
        notify_chat: 'all',
        notify_comments: true,
        notify_likes: 'grouped',
      };
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(wantsObject(route) ? row : [row]) });
      return;
    }
    saved.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 201, headers: JSON_HEADERS, body: '' });
  });
  return saved;
}

test.describe('Notification preferences', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('a failed read offers a retry and nothing to save', async ({ page }) => {
    await mockSettings(page, { failRead: true });
    await page.goto('/profile/notifications');

    await expect(page.getByRole('heading', { level: 1, name: 'Notification preferences' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Couldn't load your notification preferences.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save preferences' })).toHaveCount(0);
  });

  test('toggling a preference by its label and saving sends it', async ({ page }) => {
    const saved = await mockSettings(page);
    await page.goto('/profile/notifications');

    const comments = page.getByRole('switch', { name: 'Comments' });
    await expect(comments).toBeChecked({ timeout: 10_000 });
    await comments.focus();
    await page.keyboard.press('Space');
    await expect(comments).not.toBeChecked();

    // Arrow keys move within a radio group.
    const likes = page.getByRole('radiogroup', { name: 'Likes' });
    await likes.getByRole('radio', { name: 'When 5 or more likes arrive' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(likes.getByRole('radio', { name: 'Off' })).toBeChecked();

    const save = page.getByRole('button', { name: 'Save preferences' });
    await save.click();

    await expect(page.getByText('Preferences saved.')).toBeVisible();
    await expect(save).toBeFocused();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ user_id: MOCK_USER_ID, notify_comments: false, notify_likes: 'off' });
  });
});

function pendingPost(id: string, title: string) {
  return {
    ...MOCK_POSTS[0],
    id,
    title,
    status: 'pending',
    post_tags: [],
  };
}

async function mockModeration(page: Page): Promise<void> {
  const pending = [pendingPost('pending-1', 'Flood help needed'), pendingPost('pending-2', 'Shelter open tonight')];

  await page.route('**/rest/v1/rpc/get_my_profile**', async (route) => {
    const profile = { ...MOCK_USER_PROFILE, is_moderator: true };
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(wantsObject(route) ? profile : [profile]) });
  });

  await page.route('**/rest/v1/posts**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === 'PATCH') {
      const id = idFilter(url);
      const index = pending.findIndex((post) => post.id === id);
      const [row] = index >= 0 ? pending.splice(index, 1) : [];
      const body = { ...(row ?? pending[0]), status: 'removed' };
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(wantsObject(route) ? body : [body]) });
      return;
    }
    if (url.includes('status=eq.pending')) {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(pending) });
      return;
    }
    await route.fallback();
  });

  await page.route('**/rest/v1/reports**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: '[]' });
  });
}

test.describe('Moderation', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockModeration(page);
  });

  test('Remove asks first, Cancel keeps the card, confirming moves focus to the next card', async ({ page }) => {
    await page.goto('/moderation');
    const first = page.getByRole('article', { name: 'Flood help needed' });
    await expect(first).toBeVisible({ timeout: 10_000 });

    await first.getByRole('button', { name: 'Remove' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove this post?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(first).toBeVisible();
    await expect(first.getByRole('button', { name: 'Remove' })).toBeFocused();

    await first.getByRole('button', { name: 'Remove' }).click();
    await dialog.getByRole('button', { name: 'Remove post' }).click();

    await expect(first).toHaveCount(0);
    await expect(page.getByText('Post removed.')).toBeVisible();
    await expect(page.getByRole('article', { name: 'Shelter open tonight' })).toBeFocused();
  });
});

test.describe('At 375px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockNotifications(page);
    await mockSettings(page);
    await mockModeration(page);
  });

  for (const [path, heading] of [
    ['/notifications', 'Notifications'],
    ['/profile/notifications', 'Notification preferences'],
    ['/moderation', 'Moderation'],
  ] as const) {
    test(`${path} does not overflow`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 10_000 });

      const { docWidth, viewport } = await page.evaluate(() => ({
        docWidth: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(docWidth).toBeLessThanOrEqual(viewport);
    });
  }
});
