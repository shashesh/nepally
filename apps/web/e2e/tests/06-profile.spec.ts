import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_USER_PROFILE } from '../fixtures/mock-data';

test.describe('Profile page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('displays user full name', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByText(MOCK_USER_PROFILE.full_name)).toBeVisible({ timeout: 10_000 });
  });

  test('displays user email', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByText(MOCK_USER_PROFILE.email)).toBeVisible({ timeout: 10_000 });
  });

  test('displays trust level badge', async ({ page }) => {
    await page.goto('/profile');

    // Level 1 = "Verified"
    await expect(page.getByText(/level 1|verified/i)).toBeVisible({ timeout: 10_000 });
  });

  test('profile page has correct title', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveTitle(/profile.*nepally|nepally.*profile/i);
  });

  test('navigating to /profile from feed works', async ({ page }) => {
    await page.goto('/feed');

    // Open account menu (Mantine Menu) and use View Profile action
    await page.getByRole('button', { name: /open account menu/i }).click();
    await page.getByRole('menuitem', { name: /view profile/i }).click();

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator('[class*="profileName"]').filter({ hasText: MOCK_USER_PROFILE.full_name })).toBeVisible({ timeout: 10_000 });
  });

  test('Saved Posts tab is visible on the profile page', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('button', { name: 'Saved Posts' })).toBeVisible({ timeout: 10_000 });
  });

  test('switching to Saved Posts tab shows empty state when no posts saved', async ({ page }) => {
    await page.goto('/profile');

    await page.getByRole('button', { name: 'Saved Posts' }).click();

    // The mock returns [] for saved_posts, so we should see an empty message
    await expect(page.getByText(/No saved posts yet\./i)).toBeVisible({ timeout: 10_000 });
  });

  test('About tab is visible and can be activated', async ({ page }) => {
    await page.goto('/profile');

    const aboutBtn = page.getByRole('button', { name: 'About' });
    await expect(aboutBtn).toBeVisible({ timeout: 10_000 });
    await aboutBtn.click();

    // Posts tab content should no longer be visible
    await expect(page.getByText('You have not created any posts yet.')).not.toBeVisible();
  });
});
