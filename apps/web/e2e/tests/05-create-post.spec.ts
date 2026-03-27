import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_TAGS } from '../fixtures/mock-data';

test.describe('Create post page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('renders create post form', async ({ page }) => {
    await page.goto('/posts/create');

    await expect(page.getByRole('heading', { name: /create post/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/what.*about/i)).toBeVisible();
    await expect(page.getByPlaceholder(/write your post/i)).toBeVisible();
  });

  test('Post button is disabled when form is empty', async ({ page }) => {
    await page.goto('/posts/create');

    await expect(page.getByRole('heading', { name: /create post/i })).toBeVisible({ timeout: 10_000 });
    const postBtn = page.getByRole('button', { name: /^post$/i });
    await expect(postBtn).toBeDisabled();
  });

  test('shows inline error when title is too short', async ({ page }) => {
    await page.goto('/posts/create');

    await expect(page.getByPlaceholder(/what.*about/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/what.*about/i).fill('Hi');
    await page.getByPlaceholder(/write your post/i).click(); // blur title

    await expect(page.getByText(/at least 5 characters/i).first()).toBeVisible();
  });

  test('shows inline error when body is too short', async ({ page }) => {
    await page.goto('/posts/create');

    await expect(page.getByPlaceholder(/write your post/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/write your post/i).fill('Short');
    await page.getByPlaceholder(/what.*about/i).click(); // blur body

    await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
  });

  test('successful post submission redirects to feed', async ({ page }) => {
    await page.goto('/posts/create');

    // Wait for tags to load
    const housingTagBtn = page.getByRole('button', { name: new RegExp(`${MOCK_TAGS[0].name} tag`, 'i') });
    await expect(housingTagBtn).toBeVisible({ timeout: 10_000 });

    // Fill the form
    await page.getByPlaceholder(/what.*about/i).fill('This is a valid test post title');
    await page.getByPlaceholder(/write your post/i).fill('This is the body of the post with enough content to pass validation.');

    // Select a tag
    await housingTagBtn.click();

    // Submit
    const postBtn = page.getByRole('button', { name: /^post$/i });
    await expect(postBtn).toBeEnabled();
    await postBtn.click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 10_000 });
  });

  test('Cancel button returns to previous page', async ({ page }) => {
    await page.goto('/posts/create');
    await expect(page).toHaveURL(/\/posts\/create/);
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page).toHaveURL(/\/feed/);
  });
});
