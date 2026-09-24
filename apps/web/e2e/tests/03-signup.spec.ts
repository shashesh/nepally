import { test, expect } from '@playwright/test';
import { mockAuthError, mockSignUp, mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_USER_EMAIL } from '../fixtures/mock-data';

test.describe('Signup flow', () => {
  test('valid signup redirects to post-signup destination', async ({ page }) => {
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
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/(verify-email\?email=|feed)/, { timeout: 10_000 });
  });

  test('invalid full name shows error', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('A'); // too short / invalid
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('invalid email shows error', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email').fill('');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test('weak password lists its unmet rules on the field after submit', async ({ page }) => {
    await page.goto('/signup');
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('weak');
    // Nothing shows before the first submit.
    await expect(password).not.toHaveAttribute('aria-invalid', 'true');

    await page.getByRole('button', { name: /create account/i }).click();

    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toHaveAccessibleDescription(/Password must be at least 8 characters/);
    await expect(password).toHaveAccessibleDescription(/Password must contain at least one uppercase letter/);
    await expect(password).toHaveAccessibleDescription(/Password must contain at least one number/);

    await password.fill('Password123');
    await expect(password).not.toHaveAccessibleDescription(/Password must/);
  });

  test('already existing email redirects to login with info message', async ({ page }) => {
    test.slow();

    await mockAuthError(page, '**/auth/v1/signup**', {
      status: 422,
      code: 'user_already_exists',
      message: 'User already registered',
    });

    await page.goto('/signup');
    await expect(page.getByLabel('Full name')).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to login page with info message
    await expect(page).toHaveURL(/\/login\?reason=existing-account/);
    await expect(page.getByText(/account with this email already exists/i)).toBeVisible();
  });
});
