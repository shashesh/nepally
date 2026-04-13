import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import {
  MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE,
  MOCK_MARKETPLACE_LISTING_OWN_ACTIVE,
} from '../fixtures/mock-data';

test.describe('Marketplace full feature flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('home page loads categories, recent listings, and actions', async ({ page }) => {
    await page.goto('/marketplace');

    await expect(page.getByRole('heading', { name: /^marketplace$/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('textbox', { name: /^category$/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /recently added/i })).toBeVisible();
    await expect(
      page.getByRole('region', { name: /recently added/i }).getByText(MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /create listing/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /my listings/i })).toBeVisible();
  });

  test('search from marketplace home navigates to search results route', async ({ page }) => {
    await page.goto('/marketplace');

    await page.getByPlaceholder(/search marketplace/i).fill('resume review');
    await page.getByPlaceholder(/search marketplace/i).press('Enter');

    await expect(page).toHaveURL(/\/marketplace\?q=resume/);
    await expect(page.getByRole('heading', { name: /search: resume review/i })).toBeVisible();
  });

  test('category page shows filtered listings and back navigation', async ({ page }) => {
    await page.goto('/marketplace/food-restaurants');

    await expect(page.getByRole('heading', { name: /food & restaurants/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title).first()).toBeVisible();

    await page.getByRole('link', { name: /back to marketplace/i }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
  });

  test('listing detail supports save toggle and contact seller', async ({ page }) => {
    await page.goto(`/marketplace/listing/${MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.id}`);

    await expect(page.getByRole('heading', { name: MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.title })).toBeVisible({ timeout: 10_000 });

    const saveButton = page.getByRole('button', { name: /^save$/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    await expect(page.getByRole('button', { name: /saved/i })).toBeVisible();

    await page.getByRole('button', { name: /contact seller/i }).click();
    await expect(page).toHaveURL(/\/messages\?to=marketplace-other-user-0001/);
  });

  test('create listing flow submits and returns to marketplace', async ({ page }) => {
    const createdTitle = 'Queens Nepali Tax Filing Service';

    await page.goto('/marketplace/create');

    await expect(page.getByRole('heading', { name: /create listing/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /food & restaurants/i }).click();
    await page.getByLabel('Title *').fill(createdTitle);
    await page.getByLabel('Description *').fill('Reliable filing support for state and federal tax returns.');
    await page.getByLabel('Business Name *').fill('Nepal Tax Hub');

    await page.getByRole('button', { name: /^create listing$/i }).click();

    await expect(page).toHaveURL(/\/marketplace$/);
    await expect(page.getByText(createdTitle).first()).toBeVisible();
  });

  test('my listings supports deactivate, reactivate, and delete actions', async ({ page }) => {
    await page.goto('/marketplace/my-listings');

    await expect(page.getByRole('heading', { name: /my listings/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /deactivate/i }).click();
    await expect(page.getByRole('button', { name: /reactivate/i })).toBeVisible();

    await page.getByRole('button', { name: /reactivate/i }).click();
    await expect(page.getByRole('button', { name: /deactivate/i })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByText(MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title)).toHaveCount(0);
  });

  test('profile Listings tab shows user marketplace listings', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('button', { name: /^listings$/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^listings$/i }).click();

    await expect(page.getByText(MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title)).toBeVisible();
  });
});
