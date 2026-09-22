import { expect, type Page, type Route } from '@playwright/test';
import { formatPublicName } from '@nepally/shared';
import {
  MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE,
  MOCK_POST_OTHER_AUTHOR,
  MOCK_POSTS,
  MOCK_SAVED_LOCATIONS,
  MOCK_UPCOMING_EVENTS,
  MOCK_USER_PROFILE,
} from '../fixtures/mock-data';
import { mockSearchRoutes } from '../helpers/search-mock';

export type VisualPage = {
  /** Screenshot file stem and a11y-baseline key suffix. */
  name: string;
  path: string;
  signedIn: boolean;
  /** Extra routes registered after the default mocks (they take priority). */
  setup?: (page: Page) => Promise<void>;
  /** Resolves once the page shows its real content (not a skeleton). */
  ready: (page: Page) => Promise<void>;
  /** Limit to these projects (default: both). */
  projects?: Array<'visual-desktop' | 'visual-phone'>;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const READY_TIMEOUT = { timeout: 15_000 };

function wantsSingleObject(route: Route): boolean {
  return (route.request().headers()['accept'] ?? '').includes('application/vnd.pgrst.object+json');
}

async function heading(page: Page, name: RegExp): Promise<void> {
  await expect(page.getByRole('heading', { name }).first()).toBeVisible(READY_TIMEOUT);
}

export const VISUAL_PAGES: VisualPage[] = [
  { name: 'landing', path: '/', signedIn: false, ready: (page) => heading(page, /welcome to nepally/i) },
  { name: 'login', path: '/login', signedIn: false, ready: (page) => heading(page, /welcome back/i) },
  { name: 'signup', path: '/signup', signedIn: false, ready: (page) => heading(page, /join nepally/i) },
  {
    name: 'feed',
    path: '/feed',
    signedIn: true,
    // The pulse strip loads after the posts, so waiting on the first post
    // alone screenshots the feed with or without it, depending on timing.
    ready: async (page) => {
      await expect(page.getByText(MOCK_POSTS[0].title).first()).toBeVisible(READY_TIMEOUT);
      await expect(page.getByRole('region', { name: 'Metro pulse' })).toBeVisible(READY_TIMEOUT);
    },
  },
  {
    name: 'post-detail',
    path: `/posts/${MOCK_POST_OTHER_AUTHOR.id}`,
    signedIn: true,
    setup: async (page) => {
      const detailPost = {
        ...MOCK_POST_OTHER_AUTHOR,
        post_tags: (MOCK_POST_OTHER_AUTHOR.tags ?? []).map((tag) => ({ tag })),
      };
      await page.route('**/rest/v1/posts**', async (route) => {
        const body = wantsSingleObject(route) ? detailPost : [detailPost];
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
      });
    },
    ready: (page) => expect(page.getByText(MOCK_POST_OTHER_AUTHOR.title).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'create-post', path: '/posts/create', signedIn: true, ready: (page) => heading(page, /create post/i) },
  {
    name: 'create-listing',
    path: '/marketplace/create',
    signedIn: true,
    // The category chips arrive with the categories request, so the heading
    // alone can screenshot an empty group.
    ready: async (page) => {
      await heading(page, /create listing/i);
      await expect(page.getByRole('group', { name: 'Category *' })).toBeVisible(READY_TIMEOUT);
    },
  },
  {
    name: 'create-event',
    path: '/events/create',
    signedIn: true,
    ready: (page) => heading(page, /create event/i),
  },
  {
    name: 'profile',
    path: '/profile',
    signedIn: true,
    ready: (page) =>
      expect(page.getByRole('main').getByText(MOCK_USER_PROFILE.full_name, { exact: true }).first()).toBeVisible(
        READY_TIMEOUT
      ),
  },
  {
    name: 'profile-about',
    path: '/profile',
    signedIn: true,
    // The `profile` shot covers the Posts tab; this one covers About You and
    // the account details below it.
    ready: async (page) => {
      await heading(page, /^profile$/i);
      await page.getByRole('tab', { name: 'About' }).click();
      // Park the pointer off the tab, or desktop captures its hover tint.
      await page.mouse.move(0, 0);
      await heading(page, /about you/i);
    },
  },
  {
    name: 'manage-locations',
    path: '/profile/locations',
    signedIn: true,
    // The default mock has no saved locations, which would screenshot an
    // empty list.
    setup: async (page) => {
      await page.route('**/rest/v1/user_saved_locations**', async (route) => {
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(MOCK_SAVED_LOCATIONS) });
      });
    },
    // The heading renders before the saved locations arrive, so wait for the
    // last row as well.
    ready: async (page) => {
      await heading(page, /manage locations/i);
      const lastLabel = MOCK_SAVED_LOCATIONS[MOCK_SAVED_LOCATIONS.length - 1].label;
      await expect(page.getByRole('button', { name: `Rename ${lastLabel}` })).toBeVisible(READY_TIMEOUT);
    },
  },
  {
    name: 'public-profile',
    path: `/users/${MOCK_POST_OTHER_AUTHOR.author_id}`,
    signedIn: true,
    // The page shows the privacy-preserving public display name (first name +
    // last initial), not the raw full_name from the fixture.
    ready: (page) =>
      expect(page.getByText(formatPublicName(MOCK_USER_PROFILE.full_name)).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'events', path: '/events', signedIn: true, ready: (page) => heading(page, /events/i) },
  {
    name: 'event-detail',
    path: `/events/${MOCK_UPCOMING_EVENTS[0].id}`,
    signedIn: true,
    setup: async (page) => {
      await page.route('**/rest/v1/events**', async (route) => {
        const body = wantsSingleObject(route) ? MOCK_UPCOMING_EVENTS[0] : MOCK_UPCOMING_EVENTS;
        await route.fulfill({ status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
      });
    },
    ready: (page) => expect(page.getByText(MOCK_UPCOMING_EVENTS[0].title).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'marketplace', path: '/marketplace', signedIn: true, ready: (page) => heading(page, /^marketplace$/i) },
  {
    name: 'listing-detail',
    path: `/marketplace/listing/${MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.id}`,
    signedIn: true,
    ready: (page) =>
      expect(page.getByText(MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE.title).first()).toBeVisible(READY_TIMEOUT),
  },
  { name: 'messages', path: '/messages', signedIn: true, ready: (page) => heading(page, /messages/i) },
  { name: 'notifications', path: '/notifications', signedIn: true, ready: (page) => heading(page, /notifications/i) },
  {
    name: 'search-results',
    path: '/search?q=thapa',
    signedIn: true,
    setup: mockSearchRoutes,
    // The heading renders before the preview resolves, so waiting on it alone
    // can screenshot the "Searching…" skeleton. Wait for a result instead.
    ready: async (page) => {
      await heading(page, /results for “thapa”/i);
      await expect(page.getByRole('link', { name: new RegExp(MOCK_POSTS[0].title) }).first()).toBeVisible(READY_TIMEOUT);
    },
  },
  {
    name: 'search-dropdown',
    path: '/feed',
    signedIn: true,
    projects: ['visual-desktop'],
    setup: mockSearchRoutes,
    ready: async (page) => {
      await page.getByRole('textbox', { name: 'Search Nepally' }).fill('thapa');
      await expect(page.getByRole('option', { name: /Bikash Thapa/ })).toBeVisible(READY_TIMEOUT);
    },
  },
];
