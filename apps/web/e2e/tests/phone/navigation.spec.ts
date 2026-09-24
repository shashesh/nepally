import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../../fixtures/auth';
import { mockSupabaseLoggedIn } from '../../helpers/supabase-mock';
import { MOCK_POST_OTHER_AUTHOR } from '../../fixtures/mock-data';

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

  test('the tab bar stays visible on empty-state and detail routes', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();

    // mockSupabaseLoggedIn's generic /rest/v1/posts** route returns every mock
    // row (buildMockPostRows()), and getPostById asks for one post with
    // .maybeSingle(), which reports more than one row as an error. Override it
    // here so the detail request sees only the post it asked for, mirroring
    // the same-purpose setup in e2e/visual/pages.ts's `post-detail` entry.
    const detailPost = {
      ...MOCK_POST_OTHER_AUTHOR,
      post_tags: (MOCK_POST_OTHER_AUTHOR.tags ?? []).map((tag) => ({ tag })),
    };
    await page.route('**/rest/v1/posts**', async (route) => {
      const wantsSingle = (route.request().headers()['accept'] ?? '').includes('application/vnd.pgrst.object+json');
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wantsSingle ? detailPost : [detailPost]),
      });
    });
    await page.goto(`/posts/${MOCK_POST_OTHER_AUTHOR.id}`);
    await expect(page.getByText(MOCK_POST_OTHER_AUTHOR.title).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();
  });
});
