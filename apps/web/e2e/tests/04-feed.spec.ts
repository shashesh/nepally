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

    // Sidebar tag links should render and point to feed tag query routes
    const housingLink = page.locator('a[href="/feed?tags=housing"]');
    const jobsLink = page.locator('a[href="/feed?tags=jobs"]');
    await expect(housingLink).toBeVisible({ timeout: 10_000 });
    await expect(jobsLink).toBeVisible();
  });

  test('tag filter chip updates URL query', async ({ page }) => {
    await page.goto('/feed');

    // Click the sidebar Housing tag filter link
    const housingLink = page.locator('a[href="/feed?tags=housing"]');
    await expect(housingLink).toBeVisible({ timeout: 10_000 });

    await housingLink.click();

    // URL should include the tag slug
    await expect(page).toHaveURL(/tags=housing/);
  });

  test('shows create post button for verified users', async ({ page }) => {
    await page.goto('/feed');

    // trust_level:1 user should see the explicit Create Post composer CTA in feed content
    const composerCreatePost = page.getByRole('main').getByRole('link', { name: /^create post$/i }).first();
    await expect(composerCreatePost).toBeVisible({
      timeout: 10_000,
    });
  });

  test('feed page has correct title', async ({ page }) => {
    await page.goto('/feed');
    await expect(page).toHaveTitle(/feed.*nepally|nepally.*feed/i);
  });

  test('save button is visible for non-own post', async ({ page }) => {
    await page.goto('/feed');

    // MOCK_POST_OTHER_AUTHOR has a different author_id than the logged-in user
    await expect(page.getByText(MOCK_POST_OTHER_AUTHOR.title)).toBeVisible({ timeout: 10_000 });

    // Save action lives in the post options menu for non-own posts
    const nonOwnPostCard = page.getByRole('article').filter({ hasText: MOCK_POST_OTHER_AUTHOR.title }).first();
    await nonOwnPostCard.getByLabel('Post options').click();
    await expect(page.getByRole('menuitem', { name: 'Save Post' })).toBeVisible();
  });

  test('save button is not visible for own post', async ({ page }) => {
    await page.goto('/feed');

    // MOCK_POSTS[0] has author_id === MOCK_USER_ID (own post)
    await expect(page.getByText(MOCK_POSTS[0].title)).toBeVisible({ timeout: 10_000 });

    // For own posts, Save Post should not appear in its overflow menu
    const ownPostCard = page.getByRole('article').filter({ hasText: MOCK_POSTS[0].title }).first();
    await ownPostCard.getByLabel('Post options').click();
    await expect(page.getByRole('menuitem', { name: 'Save Post' })).toHaveCount(0);
  });

  test('clicking save shows toast confirmation', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByText(MOCK_POST_OTHER_AUTHOR.title)).toBeVisible({ timeout: 10_000 });

    // Open non-own post menu and click Save Post
    const nonOwnPostCard = page.getByRole('article').filter({ hasText: MOCK_POST_OTHER_AUTHOR.title }).first();
    await nonOwnPostCard.getByLabel('Post options').click();
    await page.getByRole('menuitem', { name: 'Save Post' }).click();

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
    const widget = page.getByRole('complementary');
    await expect(widget.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });
    await expect(widget.getByText(MOCK_UPCOMING_EVENTS[0].location_name)).toBeVisible();
    await expect(widget.getByText(MOCK_UPCOMING_EVENTS[1].title)).toBeVisible();
    await expect(widget.getByText(MOCK_UPCOMING_EVENTS[1].location_name)).toBeVisible();
  });

  test('event cards show formatted date with month and day', async ({ page }) => {
    await page.goto('/feed');
    const widget = page.getByRole('complementary');
    await expect(widget.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });

    // The date block should contain the day number from the first event
    const eventDate = new Date(MOCK_UPCOMING_EVENTS[0].start_date);
    const day = eventDate.getDate().toString().padStart(2, '0');
    await expect(widget.getByText(day).first()).toBeVisible();
  });

  test('event cards link to the event detail page', async ({ page }) => {
    await page.goto('/feed');
    const widget = page.getByRole('complementary');
    await expect(widget.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });

    const eventLink = widget.locator(`a[href="/events/${MOCK_UPCOMING_EVENTS[0].id}"]`);
    await expect(eventLink).toBeVisible();
  });

  test('does not show past events in the widget', async ({ page }) => {
    await page.goto('/feed');
    const widget = page.getByRole('complementary');
    await expect(widget.getByText(MOCK_UPCOMING_EVENTS[0].title)).toBeVisible({ timeout: 10_000 });

    // The past event title should not appear — the API filters it out
    await expect(widget.getByText('Past Cultural Festival')).not.toBeVisible();
  });

  test('Sponsor Spotlight appears above Upcoming Events', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /sponsored/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /upcoming events/i })).toBeVisible();

    // Verify ordering: Sponsored section should come before events widget in DOM
    const aside = page.getByRole('complementary');
    const sponsoredBox = aside.getByRole('heading', { name: /sponsored/i });
    const eventsHeading = aside.getByRole('heading', { name: /upcoming events/i });
    const sponsoredTop = await sponsoredBox.boundingBox();
    const eventsTop = await eventsHeading.boundingBox();
    expect(sponsoredTop!.y).toBeLessThan(eventsTop!.y);
  });
});
