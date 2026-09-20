import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_POST_OTHER_AUTHOR } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function wantsSingleObject(acceptHeader: string | undefined): boolean {
  return Boolean(acceptHeader && acceptHeader.includes('application/vnd.pgrst.object+json'));
}

test.describe('Avatar menu behavior', () => {
  test('post detail: comment avatar opens a menu with View profile and Chat', async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);

    const detailPost = {
      ...MOCK_POST_OTHER_AUTHOR,
      post_tags: (MOCK_POST_OTHER_AUTHOR.tags ?? []).map((tag) => ({ tag })),
    };

    await page.unroute('**/rest/v1/posts**');
    await page.route('**/rest/v1/posts**', async (route) => {
      const acceptHeader = route.request().headers()['accept'];
      const body = wantsSingleObject(acceptHeader) ? detailPost : [detailPost];
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
    });

    await page.route('**/rest/v1/post_comments**', async (route) => {
      const comments = [
        {
          id: 'comment-1',
          post_id: MOCK_POST_OTHER_AUTHOR.id,
          author_id: 'comment-author-1',
          content: 'Interested in this post',
          parent_comment_id: null,
          is_deleted: false,
          created_at: '2026-03-01T10:00:00Z',
          author: {
            id: 'comment-author-1',
            full_name: 'Comment User',
            trust_level: 1,
            profile_photo: null,
          },
        },
      ];
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(comments) });
    });

    await page.goto(`/posts/${MOCK_POST_OTHER_AUTHOR.id}`);
    await expect(page.getByText('Comment User')).toBeVisible({ timeout: 10_000 });

    const commentAvatarButton = page.getByRole('button', { name: 'Options for Comment User' });
    await expect(commentAvatarButton).toBeVisible();

    await commentAvatarButton.click();

    // Mantine positions and portals the menu, so assert the menu itself rather
    // than a CSS-module class or how near the trigger it landed.
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'View profile' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Chat' })).toBeVisible();
  });

  test('post detail: author avatar opens a menu that links to the profile', async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);

    const detailPost = {
      ...MOCK_POST_OTHER_AUTHOR,
      post_tags: (MOCK_POST_OTHER_AUTHOR.tags ?? []).map((tag) => ({ tag })),
    };

    await page.unroute('**/rest/v1/posts**');
    await page.route('**/rest/v1/posts**', async (route) => {
      const acceptHeader = route.request().headers()['accept'];
      const body = wantsSingleObject(acceptHeader) ? detailPost : [detailPost];
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
    });

    await page.route('**/rest/v1/post_comments**', async (route) => {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
    });

    await page.goto(`/posts/${MOCK_POST_OTHER_AUTHOR.id}`);

    const authorAvatarButton = page.getByRole('button', { name: 'Options for Other Community Member' });
    await expect(authorAvatarButton).toBeVisible({ timeout: 10_000 });

    await authorAvatarButton.click();

    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'View profile' })).toHaveAttribute(
      'href',
      `/users/${MOCK_POST_OTHER_AUTHOR.author_id}`
    );
    await expect(menu.getByRole('menuitem', { name: 'Chat' })).toBeVisible();
  });
});
