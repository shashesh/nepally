import { test, expect } from '@playwright/test';

test.describe('Unauthenticated access', () => {
  test('visiting / shows landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome to nepally/i })).toBeVisible();
  });

  test('visiting /feed redirects to /login', async ({ page }) => {
    await page.goto('/feed');
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /posts/create redirects to /login', async ({ page }) => {
    await page.goto('/posts/create');
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /marketplace redirects to /login', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /marketplace/create redirects to /login', async ({ page }) => {
    await page.goto('/marketplace/create');
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /marketplace/my-listings redirects to /login', async ({ page }) => {
    await page.goto('/marketplace/my-listings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /^sign up$/i })).toBeVisible();
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /join nepally/i })).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');
    await page.locator('main').getByRole('link', { name: /^sign up$/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
