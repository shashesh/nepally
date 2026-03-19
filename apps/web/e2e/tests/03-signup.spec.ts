import { test, expect } from '@playwright/test';
import { mockSignUp, mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_USER_EMAIL } from '../fixtures/mock-data';

test.describe('Signup flow', () => {
  test('valid signup redirects to onboarding flow', async ({ page }) => {
    await mockSignUp(page, MOCK_USER_EMAIL);
    await mockSupabaseLoggedIn(page);

    // Also mock ZIP crosswalk for onboarding
    await page.route('**/rest/v1/zip_metro_crosswalk**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ zip_code: '10001', metro_area_id: 'metro-nyc-001', metro_name: 'New York', state: 'NY', city: 'New York' }]),
      });
    });

    await page.goto('/signup');
    await page.locator('#fullName').fill('Test User');
    await page.locator('#email').fill(MOCK_USER_EMAIL);
    await page.locator('#password').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/(onboarding\/zip|feed)/, { timeout: 10_000 });
  });

  test('invalid full name shows error', async ({ page }) => {
    await page.goto('/signup');
    await page.locator('#fullName').fill('A'); // too short / invalid
    await page.locator('#email').fill(MOCK_USER_EMAIL);
    await page.locator('#password').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('invalid email shows error', async ({ page }) => {
    await page.goto('/signup');
    await page.locator('#fullName').fill('Test User');
    await page.locator('#email').fill('');
    await page.locator('#password').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test('weak password shows inline errors', async ({ page }) => {
    await page.goto('/signup');
    await page.locator('#password').fill('weak');
    // Password errors appear inline as user types
    await expect(page.getByRole('list')).toBeVisible();
  });

  test('already existing email shows error from API', async ({ page }) => {
    test.slow();

    await page.route('**/auth/v1/signup**', async (route) => {
      await route.fulfill({
        status: 422,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'user_already_exists', message: 'User already registered' }),
      });
    });

    await page.goto('/signup');
    await expect(page.locator('#fullName')).toBeVisible({ timeout: 15_000 });
    await page.locator('#fullName').fill('Test User');
    await page.locator('#email').fill(MOCK_USER_EMAIL);
    await page.locator('#password').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible();
  });
});
