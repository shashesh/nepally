import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_POSTS, MOCK_TAGS } from '../fixtures/mock-data';

test.describe('Feed page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('loads and displays posts', async ({ page }) => {
    await page.goto('/feed');

    // Both mock posts should be visible
    await expect(page.getByText(MOCK_POSTS[0].title)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MOCK_POSTS[1].title)).toBeVisible();
  });

  test('displays tag filter bar', async ({ page }) => {
    await page.goto('/feed');

    // Tag filter chips should render (TagFilterBar component)
    await expect(page.getByRole('button', { name: new RegExp(MOCK_TAGS[0].name, 'i') })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: new RegExp(MOCK_TAGS[1].name, 'i') })).toBeVisible();
  });

  test('tag filter chip updates URL query', async ({ page }) => {
    await page.goto('/feed');

    // Wait for tags to load
    const housingChip = page.getByRole('button', { name: new RegExp(MOCK_TAGS[0].name, 'i') });
    await expect(housingChip).toBeVisible({ timeout: 10_000 });

    // Click the Housing tag chip
    await housingChip.click();

    // URL should include the tag slug
    await expect(page).toHaveURL(/tags=housing/);
  });

  test('shows create post button for verified users', async ({ page }) => {
    await page.goto('/feed');

    // trust_level:1 user should see the "New Post" or equivalent CTA
    await expect(page.getByRole('link', { name: /new post|create post|\+ post/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('feed page has correct title', async ({ page }) => {
    await page.goto('/feed');
    await expect(page).toHaveTitle(/feed.*nusa|nusa.*feed/i);
  });
});
