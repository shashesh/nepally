import type { User, Post, Tag, Event, MarketplaceCategory, MarketplaceListing } from '@nepally/shared';

export const MOCK_USER_ID = 'e2e-user-00000000-0000-0000-0000-000000000001';
export const MOCK_USER_EMAIL = 'e2e-test@nusa.app';
export const MOCK_METRO_ID = 'metro-nyc-001';

export const MOCK_USER_PROFILE: User = {
  id: MOCK_USER_ID,
  email: MOCK_USER_EMAIL,
  full_name: 'E2E Test User',
  phone: undefined,
  profile_photo: undefined,
  metro_area_id: MOCK_METRO_ID,
  zip_code: '10001',
  trust_level: 1,
  email_verified: true,
  phone_verified: false,
  facebook_verified: false,
  google_verified: false,
  posts_count: 3,
  helpful_votes_received: 0,
  reports_received: 0,
  is_premium: false,
  is_banned: false,
  ban_reason: undefined,
  is_moderator: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  last_active_at: '2025-01-01T00:00:00Z',
};

export const MOCK_TAGS: Tag[] = [
  {
    id: 'tag-housing-001',
    name: 'Housing',
    slug: 'housing',
    icon: '🏠',
    color: '#4CAF50',
    description: 'Roommates, rentals, housing help',
    is_system: true,
    requires_moderation: false,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'tag-jobs-001',
    name: 'Jobs',
    slug: 'jobs',
    icon: '💼',
    color: '#2196F3',
    description: 'Job listings and career advice',
    is_system: true,
    requires_moderation: false,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'tag-help-001',
    name: 'Help',
    slug: 'help',
    icon: '🤝',
    color: '#FF9800',
    description: 'Community help requests',
    is_system: true,
    requires_moderation: false,
    sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'tag-discussion-001',
    name: 'Discussion',
    slug: 'discussion',
    icon: '💬',
    color: '#9C27B0',
    description: 'General community discussion',
    is_system: true,
    requires_moderation: false,
    sort_order: 4,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'post-001-00000000-0000-0000-0000-000000000001',
    author_id: MOCK_USER_ID,
    metro_area_id: MOCK_METRO_ID,
    location_zip_code: '10001',
    location_city: 'New York',
    location_state: 'NY',
    title: 'Looking for roommate in Queens',
    description: 'Seeking a responsible roommate for a 2BR apartment in Jackson Heights. $900/mo all inclusive.',
    photos: [],
    is_global: false,
    status: 'active',
    views_count: 42,
    responses_count: 3,
    reports_count: 0,
    likes_count: 5,
    comments_count: 2,
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
    author: {
      id: MOCK_USER_ID,
      full_name: 'E2E Test User',
      trust_level: 1,
      profile_photo: null,
    },
    tags: [MOCK_TAGS[0]],
  },
  {
    id: 'post-002-00000000-0000-0000-0000-000000000002',
    author_id: MOCK_USER_ID,
    metro_area_id: MOCK_METRO_ID,
    location_zip_code: '10001',
    location_city: 'New York',
    location_state: 'NY',
    title: 'Software engineer job opening at startup',
    description: 'We are hiring a full-stack engineer. React + Node experience required. Remote-friendly.',
    photos: [],
    is_global: false,
    status: 'active',
    views_count: 100,
    responses_count: 7,
    reports_count: 0,
    likes_count: 12,
    comments_count: 4,
    created_at: '2025-06-02T08:00:00Z',
    updated_at: '2025-06-02T08:00:00Z',
    author: {
      id: MOCK_USER_ID,
      full_name: 'E2E Test User',
      trust_level: 1,
      profile_photo: null,
    },
    tags: [MOCK_TAGS[1]],
  },
];

/** A post by a different author — used to verify save button is rendered for non-own posts */
export const MOCK_POST_OTHER_AUTHOR: Post = {
  id: 'post-003-00000000-0000-0000-0000-000000000003',
  author_id: 'other-author-0000-0000-0000-000000000002',
  metro_area_id: MOCK_METRO_ID,
  location_zip_code: '10001',
  location_city: 'New York',
  location_state: 'NY',
  title: 'Community event at local temple',
  description: 'Join us for a Dashain celebration at the community center this Saturday.',
  photos: [],
  is_global: false,
  status: 'active',
  views_count: 20,
  responses_count: 1,
  reports_count: 0,
  likes_count: 3,
  comments_count: 0,
  created_at: '2025-06-03T09:00:00Z',
  updated_at: '2025-06-03T09:00:00Z',
  author: {
    id: 'other-author-0000-0000-0000-000000000002',
    full_name: 'Other Community Member',
    trust_level: 1,
    profile_photo: null,
  },
  tags: [MOCK_TAGS[2]],
};

const FUTURE_1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
const FUTURE_2 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST_EVENT = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_UPCOMING_EVENTS: Event[] = [
  {
    id: 'event-feed-001',
    title: 'Dashain Celebration 2026',
    description: 'Annual Dashain celebration with cultural programs.',
    event_type: 'cultural',
    start_date: FUTURE_1,
    location_name: 'Central Park, NYC',
    metro_area_id: MOCK_METRO_ID,
    is_global: false,
    organizer_id: 'other-author-0000-0000-0000-000000000002',
    rsvp_count: 12,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'event-feed-002',
    title: 'Tech Networking Night',
    description: 'Connect with Nepali professionals in the area.',
    event_type: 'career',
    start_date: FUTURE_2,
    location_name: 'Google Pier 57',
    metro_area_id: MOCK_METRO_ID,
    is_global: false,
    organizer_id: 'other-author-0000-0000-0000-000000000002',
    rsvp_count: 25,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/** A past event — should NOT appear in the upcoming events widget */
export const MOCK_PAST_EVENT: Event = {
  id: 'event-feed-past-001',
  title: 'Past Cultural Festival',
  description: 'This event already happened.',
  event_type: 'cultural',
  start_date: PAST_EVENT,
  location_name: 'Community Hall',
  metro_area_id: MOCK_METRO_ID,
  is_global: false,
  organizer_id: 'other-author-0000-0000-0000-000000000002',
  rsvp_count: 0,
  rsvp_visibility: 'public',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_ZIP_METRO = [
  {
    zip_code: '10001',
    metro_area_id: MOCK_METRO_ID,
    metro_name: 'New York-Newark-Jersey City',
    state: 'NY',
    city: 'New York',
  },
];

export const MOCK_MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Food & Restaurants',
    slug: 'food-restaurants',
    emoji: '🍜',
    icon: 'restaurant',
    color: '#FF6B35',
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Professional Services',
    slug: 'professional-services',
    emoji: '💼',
    icon: 'briefcase',
    color: '#2196F3',
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Other',
    slug: 'other',
    emoji: '📦',
    icon: 'cube',
    color: '#9E9E9E',
    sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const MOCK_MARKETPLACE_LISTING_OWN_ACTIVE: MarketplaceListing = {
  id: 'mp-listing-own-active-001',
  owner_id: MOCK_USER_ID,
  metro_area_id: MOCK_METRO_ID,
  category_id: MOCK_MARKETPLACE_CATEGORIES[0].id,
  listing_type: 'business',
  status: 'active',
  title: 'Everest Momo Catering',
  description: 'Fresh momo and Nepali catering for family and community events.',
  photos: [],
  price: '$12 per plate',
  business_name: 'Everest Momo Catering',
  address: 'Queens, NY',
  business_hours: null,
  item_condition: null,
  phone: '555-111-2222',
  email: 'hello@everestmomo.test',
  website_url: 'https://everestmomo.test',
  views_count: 31,
  saves_count: 6,
  contacts_count: 4,
  is_global: false,
  refreshed_at: new Date().toISOString(),
  created_at: '2025-06-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
  category: MOCK_MARKETPLACE_CATEGORIES[0],
  owner: {
    id: MOCK_USER_ID,
    full_name: MOCK_USER_PROFILE.full_name,
    trust_level: MOCK_USER_PROFILE.trust_level,
    profile_photo: null,
  },
};

export const MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE: MarketplaceListing = {
  id: 'mp-listing-other-active-001',
  owner_id: 'marketplace-other-user-0001',
  metro_area_id: MOCK_METRO_ID,
  category_id: MOCK_MARKETPLACE_CATEGORIES[1].id,
  listing_type: 'individual',
  status: 'active',
  title: 'Resume Review + Interview Prep',
  description: 'Professional resume editing and mock interview coaching.',
  photos: [],
  price: '$40/session',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used',
  phone: '555-333-4444',
  email: 'coach@example.test',
  website_url: null,
  views_count: 17,
  saves_count: 2,
  contacts_count: 1,
  is_global: false,
  refreshed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: '2025-06-03T00:00:00Z',
  updated_at: '2025-06-03T00:00:00Z',
  category: MOCK_MARKETPLACE_CATEGORIES[1],
  owner: {
    id: 'marketplace-other-user-0001',
    full_name: 'Sita Gurung',
    trust_level: 1,
    profile_photo: null,
  },
};

export const MOCK_MARKETPLACE_LISTINGS: MarketplaceListing[] = [
  MOCK_MARKETPLACE_LISTING_OWN_ACTIVE,
  MOCK_MARKETPLACE_LISTING_OTHER_ACTIVE,
];

/** Minimal fake Supabase JWT session structure */
export function makeFakeSession(userId = MOCK_USER_ID, email = MOCK_USER_EMAIL) {
  const fakeJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    btoa(JSON.stringify({ sub: userId, email, role: 'authenticated', exp: 9999999999 })) +
    '.fake-signature';

  return {
    access_token: fakeJwt,
    refresh_token: 'e2e-refresh-token',
    expires_in: 3600,
    expires_at: 9999999999,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: '2025-01-01T00:00:00Z',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'E2E Test User' },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  };
}
