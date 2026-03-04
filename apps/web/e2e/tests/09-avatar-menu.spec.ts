import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_POST_OTHER_AUTHOR } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function wantsSingleObject(acceptHeader: string | undefined): boolean {
  return Boolean(acceptHeader && acceptHeader.includes('application/vnd.pgrst.object+json'));
}

test.describe('Avatar menu behavior', () => {
  test('post detail: comment avatar opens anchored menu with View Profile and Chat', async ({ page }) => {
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

    const commentAvatarButton = page.getByLabel('User options').nth(1);
    await expect(commentAvatarButton).toBeVisible();

    const avatarBox = await commentAvatarButton.boundingBox();
    await commentAvatarButton.click();

    const dropdown = page.locator('div[class*="avatarDropdownAnchored"]').first();
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText('View Profile')).toBeVisible();
    await expect(dropdown.getByText('Chat')).toBeVisible();

    const dropdownBox = await dropdown.boundingBox();
    expect(avatarBox).not.toBeNull();
    expect(dropdownBox).not.toBeNull();

    if (avatarBox && dropdownBox) {
      expect(Math.abs(dropdownBox.x - avatarBox.x)).toBeLessThan(260);
      expect(Math.abs(dropdownBox.y - avatarBox.y)).toBeLessThan(260);
    }
  });

  test('post detail: author avatar also opens anchored menu', async ({ page }) => {
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

    const authorAvatarButton = page.getByLabel('User options').first();
    await expect(authorAvatarButton).toBeVisible({ timeout: 10_000 });

    const authorBox = await authorAvatarButton.boundingBox();
    await authorAvatarButton.click();

    const dropdown = page.locator('div[class*="avatarDropdownAnchored"]').first();
    await expect(dropdown.getByText('View Profile')).toBeVisible();
    await expect(dropdown.getByText('Chat')).toBeVisible();

    const dropdownBox = await dropdown.boundingBox();
    expect(authorBox).not.toBeNull();
    expect(dropdownBox).not.toBeNull();

    if (authorBox && dropdownBox) {
      expect(Math.abs(dropdownBox.x - authorBox.x)).toBeLessThan(260);
      expect(Math.abs(dropdownBox.y - authorBox.y)).toBeLessThan(260);
    }
  });
});
