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
    // A NativeSelect, so a combobox rather than Mantine Select's textbox
    // (implementation decision 26).
    await expect(page.getByRole('combobox', { name: /^category$/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /recently added/i })).toBeVisible();
    await expect(
      page.getByRole('region', { name: /recently added/i }).getByText(MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title)
    ).toBeVisible();
    // They navigate, so they are links now: <Button component={Link}> rather
    // than a <Button> wrapped in a <Link> (recon 8).
    await expect(page.getByRole('link', { name: /create listing/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /my listings/i })).toBeVisible();
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

    // The toggle keeps one name; aria-pressed carries the state, so pressing
    // it flips the attribute rather than renaming the button.
    const saveButton = page.getByRole('button', { name: /save listing/i });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toHaveAttribute('aria-pressed', 'false');
    await saveButton.click();

    await expect(saveButton).toHaveAttribute('aria-pressed', 'true');

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
    const title = MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title;
    await page.goto('/marketplace/my-listings');

    await expect(page.getByRole('heading', { level: 1, name: /my listings/i })).toBeVisible({ timeout: 10_000 });
    const row = page.getByRole('article').filter({ has: page.getByRole('link', { name: title }) });
    await expect(row).toBeVisible();
    const menu = page.getByRole('button', { name: `Actions for ${title}` });

    // Each row's actions live in one menu; Deactivate and Delete ask in a dialog.
    await menu.click();
    await page.getByRole('menuitem', { name: 'Deactivate' }).click();
    const deactivate = page.getByRole('dialog', { name: 'Deactivate this listing?' });
    await deactivate.getByRole('button', { name: 'Deactivate' }).click();
    await expect(row.getByText('Status: Inactive')).toBeVisible();

    await menu.click();
    await page.getByRole('menuitem', { name: 'Reactivate' }).click();
    await expect(row.getByText('Status: Active')).toBeVisible();

    await menu.click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const remove = page.getByRole('dialog', { name: 'Delete this listing?' });
    await expect(remove.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await remove.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('link', { name: title })).toHaveCount(0);
    // The deleted row's menu trigger is gone; focus must not be.
    await expect(page.locator('body')).not.toBeFocused();
  });

  test('promote wizard reaches review by keyboard', async ({ page }) => {
    await page.goto(`/marketplace/listing/promote/${MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.id}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Promote listing' })).toBeVisible({ timeout: 10_000 });
    const featured = page.getByRole('radio', { name: 'Featured Listing' });
    await featured.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Sponsored Feed' })).toBeChecked();

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Set duration' })).toBeFocused();
    const days = page.getByRole('spinbutton', { name: 'Duration in days' });
    await days.focus();
    await page.keyboard.press('ArrowUp');
    await expect(days).toHaveValue('8');

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Review and pay' })).toBeFocused();
    // Stop here: Pay leaves for Stripe.
    await expect(page.getByRole('button', { name: 'Pay $23.92' })).toBeVisible();
  });

  test('profile Listings tab shows user marketplace listings', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('tab', { name: /^listings$/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('tab', { name: /^listings$/i }).click();

    await expect(page.getByText(MOCK_MARKETPLACE_LISTING_OWN_ACTIVE.title)).toBeVisible();
  });
});
