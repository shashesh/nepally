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
    await expect(
      page.getByRole('main').getByText(MOCK_USER_PROFILE.full_name, { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('a dialog opened from the profile menu takes focus and gives it back to the menu', async ({ page }) => {
    await page.goto('/profile');

    const trigger = page.getByRole('button', { name: 'Open profile menu' });
    await trigger.click();
    await page.getByRole('menuitem', { name: 'Edit Name' }).click();

    const dialog = page.getByRole('dialog', { name: 'Edit name' });
    const field = dialog.getByRole('textbox', { name: 'Full name' });
    await expect(field).toBeFocused();
    await page.keyboard.type(' Jr');
    await expect(field).toHaveValue(`${MOCK_USER_PROFILE.full_name} Jr`);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('Saved Posts tab is visible on the profile page', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('tab', { name: 'Saved Posts' })).toBeVisible({ timeout: 10_000 });
  });

  test('switching to Saved Posts tab shows empty state when no posts saved', async ({ page }) => {
    await page.goto('/profile');

    await page.getByRole('tab', { name: 'Saved Posts' }).click();

    // The mock returns [] for saved_posts, so we should see an empty message
    await expect(page.getByText(/No saved posts yet\./i)).toBeVisible({ timeout: 10_000 });
  });

  test('About tab is visible and can be activated', async ({ page }) => {
    await page.goto('/profile');

    const aboutTab = page.getByRole('tab', { name: 'About' });
    await expect(aboutTab).toBeVisible({ timeout: 10_000 });
    await aboutTab.click();

    // Posts tab content should no longer be visible
    await expect(page.getByText('You have not created any posts yet.')).not.toBeVisible();
  });
});
