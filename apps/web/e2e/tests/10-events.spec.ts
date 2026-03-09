import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { injectAuthSession } from '../fixtures/auth';
import { mockSupabaseLoggedIn } from '../helpers/supabase-mock';
import { MOCK_USER_ID, MOCK_METRO_ID } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

const MOCK_EVENTS = [
  {
    id: 'event-e2e-001',
    title: 'Dashain Celebration 2026',
    description: 'Annual Dashain celebration with cultural programs.',
    event_type: 'cultural',
    start_date: FUTURE,
    end_date: null,
    location_name: 'Dallas Convention Center',
    location_address: '650 S Griffin St, Dallas, TX',
    metro_area_id: MOCK_METRO_ID,
    is_global: false,
    organizer_id: 'other-user-001',
    photo_url: null,
    rsvp_count: 12,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer: {
      id: 'other-user-001',
      full_name: 'Asha Kumar',
      trust_level: 1,
      profile_photo: null,
    },
  },
  {
    id: 'event-e2e-002',
    title: 'Career Networking Night',
    description: 'Connect with Nepali professionals in the area.',
    event_type: 'career',
    start_date: FUTURE,
    end_date: null,
    location_name: 'Tech Hub Dallas',
    location_address: null,
    metro_area_id: MOCK_METRO_ID,
    is_global: false,
    organizer_id: 'other-user-002',
    photo_url: null,
    rsvp_count: 25,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer: {
      id: 'other-user-002',
      full_name: 'Rohan Shrestha',
      trust_level: 1,
      profile_photo: null,
    },
  },
  {
    id: 'event-e2e-003',
    title: 'Past Cultural Festival',
    description: 'This event already happened.',
    event_type: 'cultural',
    start_date: PAST,
    end_date: null,
    location_name: 'Community Hall',
    location_address: null,
    metro_area_id: MOCK_METRO_ID,
    is_global: false,
    organizer_id: 'other-user-001',
    photo_url: null,
    rsvp_count: 0,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer: null,
  },
];

const MOCK_ORGANIZER_EVENT = {
  ...MOCK_EVENTS[0],
  organizer_id: MOCK_USER_ID,
  organizer: {
    id: MOCK_USER_ID,
    full_name: 'E2E Test User',
    trust_level: 1,
    profile_photo: null,
  },
};

const MOCK_CANCELLED_EVENT = {
  ...MOCK_EVENTS[0],
  status: 'cancelled',
};

/**
 * Mocks all events-related Supabase endpoints.
 * Call BEFORE page.goto().
 */
async function mockEventsEndpoints(
  page: Page,
  options: {
    events?: typeof MOCK_EVENTS;
    eventDetail?: (typeof MOCK_EVENTS)[0];
    attendees?: { id: string; event_id: string; user_id: string; created_at: string; user: any }[];
  } = {}
) {
  const events = options.events ?? MOCK_EVENTS;
  const eventDetail = options.eventDetail ?? MOCK_EVENTS[0];
  const attendees = options.attendees ?? [];

  // Events list + single event GET
  await page.route('**/rest/v1/events**', async (route) => {
    const accept = route.request().headers()['accept'] ?? '';
    const isSingle = accept.includes('application/vnd.pgrst.object+json');
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(isSingle ? eventDetail : events),
      });
    } else if (method === 'POST') {
      const created = { ...eventDetail, id: 'event-e2e-new-001' };
      await route.fulfill({
        status: 201,
        headers: JSON_HEADERS,
        body: JSON.stringify(isSingle ? created : [created]),
      });
    } else if (method === 'PATCH' || method === 'PUT') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(isSingle ? eventDetail : [eventDetail]),
      });
    } else {
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
    }
  });

  // RSVP table
  await page.route('**/rest/v1/event_rsvps**', async (route) => {
    const method = route.request().method();
    const accept = route.request().headers()['accept'] ?? '';
    const isSingle = accept.includes('application/vnd.pgrst.object+json');

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(isSingle ? (attendees[0] ?? null) : attendees),
      });
    } else if (method === 'POST') {
      await route.fulfill({
        status: 201,
        headers: JSON_HEADERS,
        body: JSON.stringify({}),
      });
    } else {
      // DELETE
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
    }
  });

  // Soft delete RPC
  await page.route('**/rpc/soft_delete_event**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: 'null' });
  });
}

test.describe('Events list page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockEventsEndpoints(page);
  });

  test('loads and displays event titles', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Dashain Celebration 2026')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Career Networking Night')).toBeVisible();
  });

  test('shows page title', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveTitle(/Events.*NUSA|NUSA.*Events/i, { timeout: 10_000 });
  });

  test('shows Create Event link for Level 1 user', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByRole('link', { name: /\+ Create Event/i })).toBeVisible({ timeout: 10_000 });
  });

  test('shows filter chips for all event types', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByRole('button', { name: /Cultural/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Career/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Religious/i }).first()).toBeVisible();
  });

  test('filter chip hides events of other types', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Dashain Celebration 2026')).toBeVisible({ timeout: 10_000 });

    // Click Career filter chip
    const careerChips = page.getByRole('button', { name: /Career/i });
    await careerChips.first().click();

    await expect(page.getByText('Career Networking Night')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Dashain Celebration 2026')).not.toBeVisible();
  });

  test('All chip restores full event list', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Dashain Celebration 2026')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Career/i }).first().click();
    await expect(page.getByText('Dashain Celebration 2026')).not.toBeVisible();

    await page.getByRole('button', { name: /All/i }).first().click();
    await expect(page.getByText('Dashain Celebration 2026')).toBeVisible({ timeout: 5_000 });
  });

  test('Past Events section appears for past events', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Past Events')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Past Cultural Festival')).toBeVisible();
  });

  test('shows empty state when a filter has no results', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Dashain Celebration 2026')).toBeVisible({ timeout: 10_000 });

    // Click Social — no social events in mock data
    await page.getByRole('button', { name: /Social/i }).first().click();
    await expect(page.getByText(/No Social events/i)).toBeVisible({ timeout: 5_000 });
  });

  test('event cards link to their detail page', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByText('Dashain Celebration 2026')).toBeVisible({ timeout: 10_000 });

    // Verify the card wraps with an anchor to the correct href
    const link = page.locator('a[href="/events/event-e2e-001"]');
    await expect(link).toBeVisible();
  });
});

test.describe('Event detail page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockEventsEndpoints(page, { eventDetail: MOCK_EVENTS[0] });
  });

  test('renders event title and description', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByRole('heading', { name: 'Dashain Celebration 2026' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Annual Dashain celebration with cultural programs.')).toBeVisible();
  });

  test('shows location name', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByText('Dallas Convention Center')).toBeVisible({ timeout: 10_000 });
  });

  test('shows address when present', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByText('650 S Griffin St, Dallas, TX')).toBeVisible({ timeout: 10_000 });
  });

  test('shows Organizer section with organizer name', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByText('Organizer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Asha K\./)).toBeVisible();
  });

  test('shows RSVP button for non-organizer user', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByRole('button', { name: 'RSVP' })).toBeVisible({ timeout: 10_000 });
  });

  test('shows attendance count', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByText(/12 people going/)).toBeVisible({ timeout: 10_000 });
  });

  test('shows breadcrumb back to Events', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByRole('link', { name: 'Events' })).toBeVisible({ timeout: 10_000 });
  });

  test('shows page title with event name', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page).toHaveTitle(/Dashain Celebration 2026/i, { timeout: 10_000 });
  });

  test('shows Message Organizer button for non-organizer user', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page.getByRole('button', { name: /Message Organizer/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('shows cancelled banner for cancelled event', async ({ page }) => {
    await mockEventsEndpoints(page, { eventDetail: MOCK_CANCELLED_EVENT });
    await page.goto('/events/event-e2e-001');
    await expect(page.getByText('This event has been cancelled.')).toBeVisible({ timeout: 10_000 });
  });

  test('shows organizer Manage Event card when user is organizer', async ({ page }) => {
    await mockEventsEndpoints(page, { eventDetail: MOCK_ORGANIZER_EVENT });
    await page.goto('/events/event-e2e-001');
    await expect(page.getByText('Manage Event')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Edit Event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Event' })).toBeVisible();
  });

  test('does not show Message Organizer button when user is organizer', async ({ page }) => {
    await mockEventsEndpoints(page, { eventDetail: MOCK_ORGANIZER_EVENT });
    await page.goto('/events/event-e2e-001');
    await expect(page.getByText('Manage Event')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Message Organizer/i })).not.toBeVisible();
  });
});

test.describe('Create Event page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    await mockSupabaseLoggedIn(page);
    await mockEventsEndpoints(page);
  });

  test('renders create event form', async ({ page }) => {
    await page.goto('/events/create');
    await expect(page.getByRole('heading', { name: 'Create Event' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('shows Event Name input field', async ({ page }) => {
    await page.goto('/events/create');
    await expect(page.getByPlaceholder('e.g. Dashain Celebration 2026')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('shows all event type chips', async ({ page }) => {
    await page.goto('/events/create');
    await expect(page.getByRole('button', { name: /Cultural/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Religious/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Social/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Career/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Other/i })).toBeVisible();
  });

  test('submit button is disabled when form is empty', async ({ page }) => {
    await page.goto('/events/create');
    const submitBtn = page.getByRole('button', { name: 'Create Event' });
    await expect(submitBtn).toBeDisabled({ timeout: 10_000 });
  });

  test('shows validation error for short title', async ({ page }) => {
    await page.goto('/events/create');
    await page.getByPlaceholder('e.g. Dashain Celebration 2026').fill('Hi');

    // Fill other required fields to avoid early short-circuit
    await page.getByPlaceholder("Tell people about your event...").fill('Long enough description here for test.');
    await page.getByRole('button', { name: /Cultural/i }).click();
    await page.getByPlaceholder('e.g. Dallas Convention Center').fill('Some Venue');

    await page.getByRole('button', { name: 'Create Event' }).click();
    await expect(page.getByText(/Title must be at least 5 characters/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('submit creates event and navigates to detail page', async ({ page }) => {
    await page.goto('/events/create');
    await page.getByPlaceholder('e.g. Dashain Celebration 2026').fill('Dashain Celebration 2026');
    await page.getByPlaceholder("Tell people about your event...").fill(
      'Annual Dashain celebration with cultural programs and food.'
    );
    await page.getByRole('button', { name: /Cultural/i }).click();
    await page.getByPlaceholder('e.g. Dallas Convention Center').fill('Dallas Convention Center');

    // Set start date (datetime-local)
    const futureLocal = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    await page.locator('input[type="datetime-local"]').first().fill(futureLocal);

    await page.getByRole('button', { name: 'Create Event' }).click();

    // Should navigate to the new event detail page
    await expect(page).toHaveURL(/\/events\/event-e2e-new-001/, { timeout: 10_000 });
  });

  test('Cancel link navigates back to events list', async ({ page }) => {
    await page.goto('/events/create');
    await expect(page.getByRole('link', { name: /← Events/i })).toBeVisible({ timeout: 10_000 });
  });

  test('does not show global toggle for non-premium user', async ({ page }) => {
    await page.goto('/events/create');
    await expect(page.getByText('🌐 Make Global')).not.toBeVisible({ timeout: 10_000 });
  });

  test('page title is "Create Event - NUSA"', async ({ page }) => {
    await page.goto('/events/create');
    await expect(page).toHaveTitle(/Create Event.*NUSA|NUSA.*Create Event/i, { timeout: 10_000 });
  });
});

test.describe('Events — unauthenticated redirects', () => {
  test('events list redirects to /login when not signed in', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('event detail redirects to /login when not signed in', async ({ page }) => {
    await page.goto('/events/event-e2e-001');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('create event redirects to /login when not signed in', async ({ page }) => {
    await page.goto('/events/create');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
