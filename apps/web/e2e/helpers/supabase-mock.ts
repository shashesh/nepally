import type { Page, Route } from '@playwright/test';
import {
  MOCK_USER_PROFILE,
  MOCK_TAGS,
  MOCK_POSTS,
  MOCK_POST_OTHER_AUTHOR,
  MOCK_UPCOMING_EVENTS,
  MOCK_ZIP_METRO,
  makeFakeSession,
  MOCK_USER_ID,
  MOCK_USER_EMAIL,
} from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function expectsSingleObject(route: Route): boolean {
  const acceptHeader = route.request().headers()['accept'];
  return typeof acceptHeader === 'string' && acceptHeader.includes('application/vnd.pgrst.object+json');
}

function buildMockPostRows() {
  return [...MOCK_POSTS, MOCK_POST_OTHER_AUTHOR].map((post) => ({
    ...post,
    post_tags: (post.tags ?? []).map((tag) => ({ tag })),
  }));
}

/**
 * Intercepts all Supabase REST + Auth calls for a fully authenticated session.
 * Call BEFORE page.goto(). Already-authenticated flow — no sign-in request needed.
 */
export async function mockSupabaseLoggedIn(page: Page): Promise<void> {
  // Auth: getSession / getUser
  await page.route('**/auth/v1/token**', async (route) => {
    const session = makeFakeSession();
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(session) });
  });
  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(makeFakeSession().user),
    });
  });

  // Profile
  await page.route('**/rest/v1/users**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(MOCK_USER_PROFILE),
      });
    } else {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify({}) });
    }
  });

  // Tags
  await page.route('**/rest/v1/tags**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(MOCK_TAGS),
    });
  });

  // Posts (GET returns feed; POST returns 201)
  await page.route('**/rest/v1/posts**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const requestUrl = route.request().url();
      const isSavedPostsQuery = requestUrl.includes('saved_posts.user_id=eq.');

      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(isSavedPostsQuery ? [] : buildMockPostRows()),
      });
    } else if (method === 'POST') {
      const createdPost = {
        ...buildMockPostRows()[0],
        id: 'new-post-e2e-001',
      };
      await route.fulfill({
        status: 201,
        headers: { ...JSON_HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify(expectsSingleObject(route) ? createdPost : [createdPost]),
      });
    } else {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify({}) });
    }
  });

  // Post-tags junction (create post)
  await page.route('**/rest/v1/post_tags**', async (route) => {
    await route.fulfill({ status: 201, headers: JSON_HEADERS, body: JSON.stringify([]) });
  });

  // Likes
  await page.route('**/rest/v1/post_likes**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
  });

  // Saved posts
  await page.route('**/rest/v1/saved_posts**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
    } else if (method === 'POST') {
      await route.fulfill({ status: 201, headers: JSON_HEADERS, body: JSON.stringify({}) });
    } else {
      // DELETE
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
    }
  });

  // Message unread counts (Layout top bar)
  await page.route('**/rest/v1/conversation_participants**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
  });

  // Events (upcoming events widget on feed sidebar)
  await page.route('**/rest/v1/events**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(MOCK_UPCOMING_EVENTS),
      });
    } else {
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify({}) });
    }
  });

  // ZIP → Metro lookup
  await page.route('**/rest/v1/zip_metro_crosswalk**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(MOCK_ZIP_METRO),
    });
  });

  // Metro areas (LocationContext.initActiveLocationFromUser)
  await page.route('**/rest/v1/metro_areas**', async (route) => {
    const metroArea = { id: 'metro-nyc-001', name: 'New York-Newark-Jersey City', state: 'NY' };
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(expectsSingleObject(route) ? metroArea : [metroArea]),
    });
  });

  // Saved locations
  await page.route('**/rest/v1/user_saved_locations**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
  });

  // Legacy user locations endpoint (backward compatibility)
  await page.route('**/rest/v1/user_locations**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
  });
}

/**
 * Intercepts the Supabase sign-in endpoint to simulate a successful email login.
 */
export async function mockSignIn(page: Page, email = MOCK_USER_EMAIL): Promise<void> {
  await page.route('**/auth/v1/token?grant_type=password**', async (route) => {
    const session = makeFakeSession(MOCK_USER_ID, email);
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(session) });
  });
  // Also mock the user profile fetch that follows sign-in
  await page.route('**/rest/v1/users**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(MOCK_USER_PROFILE),
    });
  });
  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(makeFakeSession().user),
    });
  });
}

/**
 * Intercepts the Supabase sign-up endpoint to simulate a successful email signup.
 */
export async function mockSignUp(page: Page, email = MOCK_USER_EMAIL): Promise<void> {
  await page.route('**/auth/v1/signup**', async (route) => {
    const session = makeFakeSession(MOCK_USER_ID, email);
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(session) });
  });
  await page.route('**/rest/v1/users**', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      // Profile upsert after signup
      await route.fulfill({
        status: 201,
        headers: JSON_HEADERS,
        body: JSON.stringify(MOCK_USER_PROFILE),
      });
    } else {
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(MOCK_USER_PROFILE),
      });
    }
  });
  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(makeFakeSession().user),
    });
  });
}
