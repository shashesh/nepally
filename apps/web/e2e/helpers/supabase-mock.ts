import type { Page, Route } from '@playwright/test';
import {
  MOCK_USER_PROFILE,
  MOCK_TAGS,
  MOCK_POSTS,
  MOCK_POST_OTHER_AUTHOR,
  MOCK_UPCOMING_EVENTS,
  MOCK_ZIP_METRO,
  MOCK_MARKETPLACE_CATEGORIES,
  MOCK_MARKETPLACE_LISTINGS,
  makeFakeSession,
  MOCK_USER_ID,
  MOCK_USER_EMAIL,
  MOCK_NEW_CONVERSATION_ID,
} from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
type MarketplaceListingRow = (typeof MOCK_MARKETPLACE_LISTINGS)[number];

function expectsSingleObject(route: Route): boolean {
  const acceptHeader = route.request().headers()['accept'];
  return typeof acceptHeader === 'string' && acceptHeader.includes('application/vnd.pgrst.object+json');
}

/**
 * Intercepts the get_my_profile() RPC (migration 036) that AuthContext and
 * createUserProfile() call for the caller's own row instead of a GET on
 * /rest/v1/users. Without this route the request falls through to the real
 * Supabase project — the fake e2e session fails auth there, the profile
 * fetch errors, and the app never considers the user logged in.
 */
async function mockGetMyProfile(page: Page): Promise<void> {
  await page.route('**/rest/v1/rpc/get_my_profile**', async (route) => {
    // get_my_profile() is RETURNS SETOF, so PostgREST replies with an array
    // unless the caller asked for a single object with .single(), which sets
    // the vnd.pgrst.object+json Accept header. (.maybeSingle() does not: it
    // takes the array and unwraps a lone row itself.) Match both rather than
    // hardcoding the shape the one current call site happens to use.
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(expectsSingleObject(route) ? MOCK_USER_PROFILE : [MOCK_USER_PROFILE]),
    });
  });
}

/**
 * Lowest-priority handler for any REST/RPC call a spec doesn't mock.
 *
 * Playwright tries the most recently registered route first, so registering
 * this before every specific route means it only answers requests nothing
 * else claims. Without it an unmocked request hits the network (or the CI
 * placeholder host) and renders a nondeterministic error state, which breaks
 * screenshot tests.
 */
export async function mockUnhandledRest(page: Page): Promise<void> {
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(expectsSingleObject(route) ? null : []),
    });
  });
}

function buildMockPostRows() {
  return [...MOCK_POSTS, MOCK_POST_OTHER_AUTHOR].map((post) => ({
    ...post,
    post_tags: (post.tags ?? []).map((tag) => ({ tag })),
  }));
}

function buildMarketplaceState() {
  return {
    categories: structuredClone(MOCK_MARKETPLACE_CATEGORIES),
    listings: structuredClone(MOCK_MARKETPLACE_LISTINGS),
    savedListingIds: [] as string[],
  };
}

function filterMarketplaceListingsByRequest<T extends object>(requestUrl: string, listings: T[]): T[] {
  const url = new URL(requestUrl);
  const params = url.searchParams;
  let filtered = [...listings];

  const idEq = params.get('id')?.replace('eq.', '');
  if (idEq) filtered = filtered.filter((listing) => (listing as { id?: string }).id === idEq);

  const ownerEq = params.get('owner_id')?.replace('eq.', '');
  if (ownerEq) filtered = filtered.filter((listing) => (listing as { owner_id?: string }).owner_id === ownerEq);

  const metroEq = params.get('metro_area_id')?.replace('eq.', '');
  if (metroEq) filtered = filtered.filter((listing) => (listing as { metro_area_id?: string }).metro_area_id === metroEq);

  const statusParam = params.get('status');
  if (statusParam?.startsWith('eq.')) {
    const statusEq = statusParam.replace('eq.', '');
    filtered = filtered.filter((listing) => (listing as { status?: string }).status === statusEq);
  }
  if (statusParam?.startsWith('neq.')) {
    const statusNeq = statusParam.replace('neq.', '');
    filtered = filtered.filter((listing) => (listing as { status?: string }).status !== statusNeq);
  }

  const categorySlugEq = params.get('category.slug')?.replace('eq.', '');
  if (categorySlugEq) {
    filtered = filtered.filter((listing) => {
        const category = (listing as { category?: { slug?: string } | null }).category;
      return category?.slug === categorySlugEq;
    });
  }

  const titleSearchRaw = params.get('title');
  if (titleSearchRaw && titleSearchRaw.includes('.')) {
    const searchPart = titleSearchRaw.split('.').slice(1).join('.').replace(/&/g, ' ').trim().toLowerCase();
    if (searchPart.length > 0) {
      filtered = filtered.filter((listing) => {
        const item = listing as { title?: string; description?: string };
        const haystack = `${String(item.title ?? '')} ${String(item.description ?? '')}`.toLowerCase();
        return haystack.includes(searchPart);
      });
    }
  }

  return filtered;
}

/**
 * Intercepts all Supabase REST + Auth calls for a fully authenticated session.
 * Call BEFORE page.goto(). Already-authenticated flow — no sign-in request needed.
 */
export async function mockSupabaseLoggedIn(page: Page): Promise<void> {
  const marketplaceState = buildMarketplaceState();

  // Must be registered before every specific route (see mockUnhandledRest).
  await mockUnhandledRest(page);
  await mockGetMyProfile(page);

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

  // Marketplace categories
  await page.route('**/rest/v1/marketplace_categories**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(marketplaceState.categories),
    });
  });

  // Marketplace listings
  await page.route('**/rest/v1/marketplace_listings**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      const listings = filterMarketplaceListingsByRequest(route.request().url(), marketplaceState.listings);
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(expectsSingleObject(route) ? listings[0] ?? null : listings),
      });
      return;
    }

    if (method === 'POST') {
      const payload = route.request().postDataJSON() as Partial<MarketplaceListingRow> & Record<string, unknown>;
      const categoryId = String(payload.category_id ?? '');
      const category = marketplaceState.categories.find((item) => item.id === categoryId) ?? null;
      const createdListing: MarketplaceListingRow = {
        id: `mp-listing-created-${marketplaceState.listings.length + 1}`,
        owner_id: String(payload.owner_id ?? MOCK_USER_ID),
        metro_area_id: String(payload.metro_area_id ?? MOCK_USER_PROFILE.metro_area_id ?? ''),
        category_id: categoryId,
        listing_type: (payload.listing_type ?? 'individual') as MarketplaceListingRow['listing_type'],
        status: 'active',
        title: String(payload.title ?? ''),
        description: String(payload.description ?? ''),
        photos: Array.isArray(payload.photos) ? (payload.photos as string[]) : [],
        price: payload.price != null ? String(payload.price) : null,
        business_name: payload.business_name != null ? String(payload.business_name) : null,
        address: payload.address != null ? String(payload.address) : null,
        business_hours: (payload.business_hours as MarketplaceListingRow['business_hours']) ?? null,
        item_condition: (payload.item_condition as MarketplaceListingRow['item_condition']) ?? null,
        phone: payload.phone != null ? String(payload.phone) : null,
        email: payload.email != null ? String(payload.email) : null,
        website_url: payload.website_url != null ? String(payload.website_url) : null,
        is_global: Boolean(payload.is_global ?? false),
        views_count: 0,
        saves_count: 0,
        contacts_count: 0,
        is_featured: false,
        trending_score: 0,
        refreshed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(category ? { category } : {}),
        owner: {
          id: MOCK_USER_ID,
          full_name: MOCK_USER_PROFILE.full_name,
          trust_level: MOCK_USER_PROFILE.trust_level,
          profile_photo: null,
        },
      };

      marketplaceState.listings.unshift(createdListing);
      await route.fulfill({
        status: 201,
        headers: JSON_HEADERS,
        body: JSON.stringify(expectsSingleObject(route) ? createdListing : [createdListing]),
      });
      return;
    }

    if (method === 'PATCH') {
      const payload = route.request().postDataJSON() as Partial<MarketplaceListingRow>;
      const listingId = new URL(route.request().url()).searchParams.get('id')?.replace('eq.', '');
      const targetIndex = marketplaceState.listings.findIndex((listing) => listing.id === listingId);
      if (targetIndex >= 0) {
        const current = marketplaceState.listings[targetIndex];
        const nextCategoryId = payload.category_id ? String(payload.category_id) : String(current.category_id);
        const nextCategory = marketplaceState.categories.find((item) => item.id === nextCategoryId) ?? current.category;

        const updated: MarketplaceListingRow = {
          ...current,
          ...payload,
          category: nextCategory,
          updated_at: new Date().toISOString(),
        };
        marketplaceState.listings[targetIndex] = updated;

        await route.fulfill({
          status: 200,
          headers: JSON_HEADERS,
          body: JSON.stringify(expectsSingleObject(route) ? updated : [updated]),
        });
        return;
      }

      await route.fulfill({ status: 404, headers: JSON_HEADERS, body: JSON.stringify({}) });
      return;
    }

    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify({}) });
  });

  // Saved listings (bookmarking)
  await page.route('**/rest/v1/saved_listings**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      const params = new URL(route.request().url()).searchParams;
      const userId = params.get('user_id')?.replace('eq.', '') ?? MOCK_USER_ID;
      if (userId !== MOCK_USER_ID) {
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
        return;
      }

      const rows = marketplaceState.savedListingIds.map((listingId) => ({ listing_id: listingId }));
      await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(rows) });
      return;
    }

    if (method === 'POST') {
      const payload = route.request().postDataJSON() as { listing_id?: string };
      if (payload.listing_id && !marketplaceState.savedListingIds.includes(payload.listing_id)) {
        marketplaceState.savedListingIds.push(payload.listing_id);
      }
      await route.fulfill({ status: 201, headers: JSON_HEADERS, body: JSON.stringify({}) });
      return;
    }

    if (method === 'DELETE') {
      const params = new URL(route.request().url()).searchParams;
      const listingId = params.get('listing_id')?.replace('eq.', '');
      if (listingId) {
        marketplaceState.savedListingIds = marketplaceState.savedListingIds.filter((item) => item !== listingId);
      }
      await route.fulfill({ status: 204, headers: JSON_HEADERS, body: '' });
      return;
    }

    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify({}) });
  });

  // Marketplace engagement RPCs
  await page.route('**/rest/v1/rpc/increment_listing_views**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify({}) });
  });
  await page.route('**/rest/v1/rpc/increment_listing_contacts**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify({}) });
  });

  // Message unread counts (Layout top bar)
  await page.route('**/rest/v1/conversation_participants**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
  });

  // Starting a chat: with no participations, getOrCreateConversation creates
  // a conversation and reads the new row back. 14-messages.spec.ts mocks a
  // populated inbox on top of this.
  await page.route('**/rest/v1/conversations**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        headers: JSON_HEADERS,
        body: JSON.stringify({ id: MOCK_NEW_CONVERSATION_ID, last_message: null, last_message_time: null }),
      });
      return;
    }
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify([]) });
  });

  // Events (upcoming events widget on feed sidebar, and the events list). The
  // list's past-events request filters on start_date=lt.<now>; it gets none,
  // so every mock event stays under "Upcoming".
  await page.route('**/rest/v1/events**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const isPastRequest = route.request().url().includes('start_date=lt.');
      await route.fulfill({
        status: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(isPastRequest ? [] : MOCK_UPCOMING_EVENTS),
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
 * Answers an Auth endpoint with a GoTrue error carrying `code`, as the real
 * server does. auth-js reads `code` from the body only when the response
 * declares API version 2024-01-01 or later, and the browser hides that header
 * from a cross-origin caller unless the response exposes it — without both
 * the error arrives with no code and the page shows its fallback sentence.
 */
export async function mockAuthError(
  page: Page,
  urlPattern: string,
  {
    status,
    code,
    message,
    gate,
  }: {
    status: number;
    code: string;
    message: string;
    /** Held until this settles, so a spec can look at the page mid-request. */
    gate?: Promise<void>;
  },
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await gate;
    await route.fulfill({
      status,
      headers: {
        ...JSON_HEADERS,
        'x-supabase-api-version': '2024-01-01',
        'access-control-expose-headers': 'x-supabase-api-version',
      },
      body: JSON.stringify({ code, message }),
    });
  });
}

/**
 * Intercepts the Supabase sign-in endpoint to simulate a successful email login.
 */
export async function mockSignIn(page: Page, email = MOCK_USER_EMAIL): Promise<void> {
  await mockGetMyProfile(page);
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
  await mockGetMyProfile(page);
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
