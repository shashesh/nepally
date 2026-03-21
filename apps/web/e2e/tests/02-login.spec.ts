import { test, expect } from '@playwright/test';
import { mockSignIn, mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_USER_EMAIL } from '../fixtures/mock-data';

test.describe('Login flow', () => {
  test('valid credentials redirect to /feed', async ({ page }) => {
    await mockSignIn(page, MOCK_USER_EMAIL);
    await mockSupabaseLoggedIn(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 10_000 });
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('');
    await page.getByLabel('Password', { exact: true }).fill('somepassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('empty password shows validation error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    // leave password empty
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/enter your password/i)).toBeVisible();
  });

  test('wrong credentials shows API error message', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password**', async (route) => {
      await route.fulfill({
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword1!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('loading state shown during submission', async ({ page }) => {
    // Slow down the auth endpoint
    await page.route('**/auth/v1/token?grant_type=password**', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    await expect(submitButton).toBeDisabled();
  });
});
