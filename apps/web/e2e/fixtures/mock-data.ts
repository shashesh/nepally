import type { User, Post, Tag } from '@nusa/shared';

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

export const MOCK_ZIP_METRO = [
  {
    zip_code: '10001',
    metro_area_id: MOCK_METRO_ID,
    metro_name: 'New York-Newark-Jersey City',
    state: 'NY',
    city: 'New York',
  },
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
