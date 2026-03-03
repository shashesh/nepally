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

    await expect(page).toHaveTitle(/profile.*nusa|nusa.*profile/i);
  });

  test('navigating to /profile from feed works', async ({ page }) => {
    await page.goto('/feed');

    // Open account menu and use View Profile action
    await page.getByRole('button', { name: /open account menu/i }).click();
    await page.getByRole('link', { name: /view profile/i }).click();

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByText(MOCK_USER_PROFILE.full_name)).toBeVisible({ timeout: 10_000 });
  });
});
