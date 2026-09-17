import type { Page } from '@playwright/test';
import { MOCK_METRO_ID, MOCK_POSTS } from '../fixtures/mock-data';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Deterministic search_* RPC responses: 1 of 4 posts, no listings, 1 person. Call after mockSupabaseLoggedIn. */
export async function mockSearchRoutes(page: Page): Promise<void> {
  await page.route('**/rest/v1/rpc/search_posts**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([{ id: MOCK_POSTS[0].id, rank: 0.8, created_at: MOCK_POSTS[0].created_at, total_count: 4 }]),
    });
  });
  await page.route('**/rest/v1/rpc/search_listings**', async (route) => {
    await route.fulfill({ status: 200, headers: JSON_HEADERS, body: '[]' });
  });
  await page.route('**/rest/v1/rpc/search_people**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify([
        {
          id: 'person-e2e-001',
          full_name: 'Bikash Thapa',
          profile_photo: null,
          trust_level: 2,
          metro_area_id: MOCK_METRO_ID,
          follower_count: 12,
          is_local: true,
          rank: 0.5,
          total_count: 1,
        },
      ]),
    });
  });
}
