import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../../fixtures/auth';
import { mockSearchRoutes } from '../../helpers/search-mock';
import { mockSupabaseLoggedIn } from '../../helpers/supabase-mock';

test('phone search opens a full-screen overlay with suggestions', async ({ page }) => {
  await injectAuthSession(page);
  await mockSupabaseLoggedIn(page);
  await mockSearchRoutes(page);
  await page.goto('/feed');

  await page.getByRole('button', { name: 'Search' }).click();
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
  await expect(dialog.getByRole('option', { name: /Bikash Thapa/ })).toBeVisible({ timeout: 10_000 });
  await dialog.getByRole('option', { name: /Bikash Thapa/ }).click();
  await expect(page).toHaveURL(/\/users\/person-e2e-001$/);
  await expect(dialog).toBeHidden();
});
