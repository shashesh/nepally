import { test, expect } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_POSTS, MOCK_POST_OTHER_AUTHOR, MOCK_TAGS, MOCK_UPCOMING_EVENTS } from '../fixtures/mock-data';

test.describe('Feed page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('loads and displays posts', async ({ page }) => {
    await page.goto('/feed');

    // Both mock posts should be visible
    await expect(page.getByText(MOCK_POSTS[0].title)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MOCK_POSTS[1].title)).toBeVisible();
  });

  test('displays tag filter bar', async ({ page }) => {
    await page.goto('/feed');

    // Tag filter chips should render (Mantine Chip — visible label text)
    await expect(page.locator('.mantine-Chip-label').filter({ hasText: new RegExp(MOCK_TAGS[0].name, 'i') })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.mantine-Chip-label').filter({ hasText: new RegExp(MOCK_TAGS[1].name, 'i') })).toBeVisible();
  });

  test('tag filter chip updates URL query', async ({ page }) => {
    await page.goto('/feed');

    // Wait for tags to load (Mantine Chip — click the visible label)
    const housingChip = page.locator('.mantine-Chip-label').filter({ hasText: new RegExp(MOCK_TAGS[0].name, 'i') });
    await expect(housingChip).toBeVisible({ timeout: 10_000 });

    // Click the Housing tag chip label
    await housingChip.click();

    // URL should include the tag slug
    await expect(page).toHaveURL(/tags=housing/);
  });

  test('shows create post button for verified users', async ({ page }) => {
    await page.goto('/feed');

    // trust_level:1 user should see the explicit Create Post button CTA
    await expect(page.getByRole('link', { name: /^create post$/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('feed page has correct title', async ({ page }) => {
    await page.goto('/feed');
    await expect(page).toHaveTitle(/feed.*nusa|nusa.*feed/i);
  });

  test('save button is visible for non-own post', async ({ page }) => {
    await page.goto('/feed');

    // MOCK_POST_OTHER_AUTHOR has a different author_id than the logged-in user
    await expect(page.getByText(MOCK_POST_OTHER_AUTHOR.title)).toBeVisible({ timeout: 10_000 });

    // The save button (aria-label="Save post") should render for non-own posts
    await expect(page.getByLabel('Save post').first()).toBeVisible();
  });

  test('save button is not visible for own post', async ({ page }) => {
    await page.goto('/feed');

    // MOCK_POSTS[0] has author_id === MOCK_USER_ID (own post)
    await expect(page.getByText(MOCK_POSTS[0].title)).toBeVisible({ timeout: 10_000 });

    // For own posts, save button should not be rendered
    // Count save buttons — only the non-own post should have one
    const saveButtons = page.getByLabel('Save post');
    await expect(saveButtons).toHaveCount(1); // Only 1: from MOCK_POST_OTHER_AUTHOR
  });

  test('clicking save shows toast confirmation', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText(MOCK_POST_OTHER_AUTHOR.title)).toBeVisible({ timeout: 10_000 });

    // Click the save button on the non-own post
    await page.getByLabel('Save post').first().click();

    // A toast should appear confirming the action
    await expect(page.getByText(/Post saved\.|Post unsaved\./)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Feed sidebar — Upcoming Events widget', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
  });

  test('shows Upcoming Events heading and View All link', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /upcoming events/i })).toBeVisible({ timeout: 10_000 });
    const viewAllLink = page.getByRole('link', { name: /view all/i });
    await expect(viewAllLink).toBeVisible();
    await expect(viewAllLink).toHaveAttribute('href', '/events');
  });

  test('displays upcoming event titles and locations', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MOCK_UPCOMING_EVENTS[0].location_name)).toBeVisible();
    await expect(page.getByText(MOCK_UPCOMING_EVENTS[1].title)).toBeVisible();
    await expect(page.getByText(MOCK_UPCOMING_EVENTS[1].location_name)).toBeVisible();
  });

  test('event cards show formatted date with month and day', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });

    // The date block should contain the day number from the first event
    const eventDate = new Date(MOCK_UPCOMING_EVENTS[0].start_date);
    const day = eventDate.getDate().toString().padStart(2, '0');
    await expect(page.getByText(day).first()).toBeVisible();
  });

  test('event cards link to the event detail page', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });

    const eventLink = page.locator(`a[href="/events/${MOCK_UPCOMING_EVENTS[0].id}"]`);
    await expect(eventLink).toBeVisible();
  });

  test('does not show past events in the widget', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });

    // The past event title should not appear — the API filters it out
    await expect(page.getByText('Past Cultural Festival')).not.toBeVisible();
  });

  test('Sponsor Spotlight appears above Upcoming Events', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText('Sponsor Spotlight')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /upcoming events/i })).toBeVisible();

    // Verify ordering: Sponsored section should come before events widget in DOM
    const aside = page.locator('aside');
    const sponsoredBox = aside.getByText('Sponsor Spotlight');
    const eventsHeading = aside.getByRole('heading', { name: /upcoming events/i });
    const sponsoredTop = await sponsoredBox.boundingBox();
    const eventsTop = await eventsHeading.boundingBox();
    expect(sponsoredTop!.y).toBeLessThan(eventsTop!.y);
  });
});
