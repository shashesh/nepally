/**
 * The inbox and a thread, end to end over a small stateful chat mock: one
 * conversation with Bikash Thapa, two unread messages, and a send that the
 * mock stores and returns.
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_USER_ID } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CONVERSATION_ID = 'conv-e2e-thread-0000-0000-000000000001';
const PARTNER_ID = 'chat-partner-0000-0000-0000-000000000009';
const PARTNER_NAME = 'Bikash Thapa';

interface MockMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  type: 'text';
  read: boolean;
  read_at: string | null;
  timestamp: string;
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function wantsObject(route: Route): boolean {
  return (route.request().headers()['accept'] ?? '').includes('application/vnd.pgrst.object+json');
}

async function mockChat(page: Page): Promise<void> {
  const messages: MockMessage[] = [
    { id: 'msg-1', conversation_id: CONVERSATION_ID, sender_id: MOCK_USER_ID, text: 'Is the room still free?', type: 'text', read: true, read_at: minutesAgo(50), timestamp: minutesAgo(60) },
    { id: 'msg-2', conversation_id: CONVERSATION_ID, sender_id: PARTNER_ID, text: 'Yes, from October.', type: 'text', read: false, read_at: null, timestamp: minutesAgo(30) },
    { id: 'msg-3', conversation_id: CONVERSATION_ID, sender_id: PARTNER_ID, text: 'Want to see it this weekend?', type: 'text', read: false, read_at: null, timestamp: minutesAgo(29) },
  ];
  let unread = 2;

  await page.route('**/rest/v1/conversation_participants**', async (route) => {
    const url = route.request().url();
    if (route.request().method() !== 'GET') {
      unread = 0;
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
      return;
    }
    // The other participant of each conversation.
    if (url.includes('user_id=neq.')) {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify([{ conversation_id: CONVERSATION_ID, user_id: PARTNER_ID, name: PARTNER_NAME }]),
      });
      return;
    }
    // The viewer's own participations (inbox) and the unread total (top bar).
    const rows = [{ conversation_id: CONVERSATION_ID, unread_count: unread }];
    const body = url.includes('unread_count=gt.') ? rows.filter((row) => row.unread_count > 0) : rows;
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
  });

  await page.route('**/rest/v1/conversations**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
      return;
    }
    const last = messages[messages.length - 1];
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([
        { id: CONVERSATION_ID, last_message: last.text, last_message_time: last.timestamp, created_at: minutesAgo(90) },
      ]),
    });
  });

  await page.route('**/rest/v1/users**', async (route) => {
    if (!route.request().url().includes('id=in.')) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([{ id: PARTNER_ID, profile_photo: null, trust_level: 1 }]),
    });
  });

  await page.route('**/rest/v1/messages**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const newestFirst = [...messages].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(newestFirst) });
      return;
    }
    if (method === 'POST') {
      const input = route.request().postDataJSON() as { conversation_id: string; sender_id: string; text: string };
      const row: MockMessage = {
        id: `msg-${messages.length + 1}`,
        conversation_id: input.conversation_id,
        sender_id: input.sender_id,
        text: input.text,
        type: 'text',
        read: false,
        read_at: null,
        timestamp: new Date().toISOString(),
      };
      messages.push(row);
      await route.fulfill({ status: 201, headers: JSON_HEADERS, body: JSON.stringify(wantsObject(route) ? row : [row]) });
      return;
    }
    await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
  });
}

test.describe('Messages', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockChat(page);
  });

  test('the inbox lists a conversation by public name with its unread count', async ({ page }) => {
    await page.goto('/messages');

    await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible({ timeout: 10_000 });
    const row = page.getByRole('link', { name: /Bikash T\..*Want to see it this weekend\?.*2 unread/ });
    await expect(row).toBeVisible();
    await expect(page.getByText(PARTNER_NAME)).toHaveCount(0);

    await row.click();
    await expect(page).toHaveURL(new RegExp(`/messages/${CONVERSATION_ID}$`));
  });

  test('a thread shows its messages and sends a new one', async ({ page }) => {
    await page.goto(`/messages/${CONVERSATION_ID}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Bikash T.' })).toBeVisible({ timeout: 10_000 });
    const log = page.getByRole('log', { name: 'Messages with Bikash T.' });
    await expect(log.getByText('Want to see it this weekend?')).toBeVisible();
    await expect(log.getByText('Is the room still free?')).toBeVisible();

    const field = page.getByRole('textbox', { name: 'Message Bikash T.' });
    await field.fill('Saturday works');
    await field.press('Enter');

    await expect(log.getByText('Saturday works')).toBeVisible();
    await expect(field).toHaveValue('');
    await expect(field).toBeFocused();
  });

  // No realtime runs under the mock, so only the thread's own "messages
  // read" signal can clear the badge here.
  test('opening a thread clears the Messages badge straight away', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('link', { name: 'Messages, 2 unread', exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: /Bikash T\./ }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Bikash T.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Messages, 2 unread', exact: true })).toHaveCount(0);
  });

  test("the thread header's avatar opens the partner's profile", async ({ page }) => {
    await page.goto(`/messages/${CONVERSATION_ID}`);

    await page.getByRole('button', { name: 'Options for Bikash T.' }).click();
    await expect(page.getByRole('menuitem', { name: 'View profile' })).toHaveAttribute('href', `/users/${PARTNER_ID}`);
  });

  test('a conversation the viewer is not in is not found, with no composer', async ({ page }) => {
    await page.goto('/messages/not-a-conversation');

    await expect(page.getByText('Conversation not found')).toBeVisible({ timeout: 10_000 });
    // The top bar's search field is the only textbox left.
    await expect(page.getByRole('textbox', { name: /^Message / })).toHaveCount(0);
  });

  test('keyboard: back link, avatar menu, field, then Send — nothing inside the log', async ({ page }) => {
    await page.goto(`/messages/${CONVERSATION_ID}`);
    const back = page.getByRole('link', { name: 'Messages', exact: true }).last();
    await expect(page.getByRole('heading', { level: 1, name: 'Bikash T.' })).toBeVisible({ timeout: 10_000 });

    await back.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Options for Bikash T.' })).toBeFocused();

    // Enter opens the menu, Escape returns to its trigger.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'View profile' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Options for Bikash T.' })).toBeFocused();

    await page.keyboard.press('Tab');
    const field = page.getByRole('textbox', { name: 'Message Bikash T.' });
    await expect(field).toBeFocused();

    // A blank field disables Send, so Tab skips it.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Send message' })).not.toBeFocused();

    await field.fill('hi');
    await field.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeFocused();
  });

  test('at 375px nothing overflows, and the composer stays pinned while reading back', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 640 });
    await page.goto(`/messages/${CONVERSATION_ID}`);
    const field = page.getByRole('textbox', { name: 'Message Bikash T.' });
    await expect(field).toBeVisible({ timeout: 10_000 });

    // Enough messages, one long and unbroken, to make the page scroll.
    for (let i = 0; i < 8; i += 1) {
      await field.fill(i === 0 ? 'x'.repeat(120) : `Message number ${i}`);
      await field.press('Enter');
      await expect(field).toHaveValue('');
    }

    const { docWidth, viewport } = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(docWidth).toBeLessThanOrEqual(viewport);

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await expect(field).toBeInViewport();
    const box = await field.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(640);
  });
});
