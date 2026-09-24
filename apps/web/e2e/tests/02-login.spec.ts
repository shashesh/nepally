import { test, expect } from '@playwright/test';
import { mockAuthError, mockSignIn, mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_USER_EMAIL } from '../fixtures/mock-data';

test.describe('Login flow', () => {
  test('valid credentials redirect to /feed', async ({ page }) => {
    await mockSignIn(page, MOCK_USER_EMAIL);
    await mockSupabaseLoggedIn(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 10_000 });
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('');
    await page.getByLabel('Password', { exact: true }).fill('somepassword');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('empty password shows validation error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    // leave password empty
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText(/enter your password/i)).toBeVisible();
  });

  test('wrong credentials show a sentence, never the raw Supabase text', async ({ page }) => {
    await mockAuthError(page, '**/auth/v1/token?grant_type=password**', {
      status: 400,
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.locator('main').getByRole('alert')).toHaveText("That email and password don't match. Check them and try again.");
    await expect(page.getByText(/invalid login credentials/i)).toHaveCount(0);
    await expect(page).toHaveURL(/\/login/);
  });

  test('Log in stays focusable and busy while signing in', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await mockAuthError(page, '**/auth/v1/token?grant_type=password**', {
      status: 400,
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
      gate,
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(MOCK_USER_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    const submitButton = page.getByRole('button', { name: 'Log in' });
    await submitButton.focus();
    await page.keyboard.press('Enter');

    await expect(submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(submitButton).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled, never the native attribute, which would drop focus.
    await expect(submitButton).not.toHaveAttribute('disabled');
    await expect(submitButton).toBeFocused();

    release();
    await expect(page.locator('main').getByRole('alert')).toBeVisible();
    await expect(submitButton).not.toHaveAttribute('aria-busy', 'true');
    await expect(submitButton).toBeFocused();
  });
});
