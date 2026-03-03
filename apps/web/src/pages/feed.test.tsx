import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const feedMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useLocationMock: vi.fn(),
  useRouterMock: vi.fn(),
  getPostsByMetroAreaMock: vi.fn(),
  getTagsMock: vi.fn(),
  getUserLikedPostIdsMock: vi.fn(),
  deletePostMock: vi.fn(),
  getOrCreateConversationMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: feedMocks.useAuthMock }));
vi.mock('../hooks/useLocation', () => ({ useLocation: feedMocks.useLocationMock }));
vi.mock('next/router', () => ({ useRouter: feedMocks.useRouterMock }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getPostsByMetroArea: feedMocks.getPostsByMetroAreaMock,
    getTags: feedMocks.getTagsMock,
    getUserLikedPostIds: feedMocks.getUserLikedPostIdsMock,
    deletePost: feedMocks.deletePostMock,
    getOrCreateConversation: feedMocks.getOrCreateConversationMock,
    formatRelativeTime: feedMocks.formatRelativeTimeMock,
    TAG_EMOJI: { housing: '🏠', jobs: '💼' },
  };
});
vi.mock('../components/TagFilterBar', () => ({
  default: ({ tags, selectedSlugs, onTagToggle, onAllPress }: any) =>
    React.createElement('div', { 'data-testid': 'tag-filter-bar' },
      React.createElement('button', { onClick: onAllPress }, 'All'),
      tags.map((t: any) =>
        React.createElement('button', { key: t.id, onClick: () => onTagToggle(t.slug) }, t.name)
      )
    ),
}));
vi.mock('../components/Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) =>
    React.createElement('a', { href, className }, children),
}));

const mockUser = {
  id: 'user-1',
  full_name: 'Test User',
  trust_level: 1,
  metro_area_id: '19100',
};

const mockActiveLocation = {
  metro_area_id: '19100',
  metro_name: 'Dallas-Fort Worth',
  metro_state: 'TX',
  source: 'saved' as const,
  is_temporary: false,
};

const mockPosts = [
  {
    id: 'post-1',
    title: 'Roommate needed in Dallas',
    description: 'Looking for a roommate.',
    author_id: 'user-2',
    author: { full_name: 'Bikal Shrestha', profile_photo: null, trust_level: 1 },
    is_global: false,
    likes_count: 3,
    comments_count: 2,
    created_at: '2026-02-24T10:00:00Z',
    tags: [{ id: 'tag-1', slug: 'housing', name: 'Housing' }],
    photos: [],
  },
];

import { FeedPage } from './feed';

describe('FeedPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    feedMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: {},
      isReady: true,
    });
    feedMocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    feedMocks.useLocationMock.mockReturnValue({ activeLocation: mockActiveLocation });
    feedMocks.getTagsMock.mockResolvedValue({ data: [] });
    feedMocks.getUserLikedPostIdsMock.mockResolvedValue({ data: [] });
  });

  it('redirects to /login when user is not logged in', async () => {
    feedMocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(<FeedPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('redirects to /onboarding/zip when user has no metro_area_id', async () => {
    feedMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, metro_area_id: null },
      loading: false,
    });
    render(<FeedPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding/zip'));
  });

  it('shows loading state while fetching posts', () => {
    feedMocks.getPostsByMetroAreaMock.mockReturnValue(new Promise(() => {}));
    render(<FeedPage />);
    expect(screen.getByTestId('feed-loading')).toBeDefined();
  });

  it('shows empty state when no posts are available', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText(/No posts yet/)).toBeDefined();
    });
  });

  it('renders composer text as a link to create post for verified users', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    render(<FeedPage />);

    await waitFor(() => {
      const composerTrigger = screen.getByText(/What's on your mind/i).closest('a');
      expect(composerTrigger.getAttribute('href')).toBe('/posts/create');
    });
  });

  it('routes composer text to profile for trust level 0 users', async () => {
    feedMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, trust_level: 0 },
      loading: false,
    });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    render(<FeedPage />);

    await waitFor(() => {
      const composerTrigger = screen.getByText(/What's on your mind/i).closest('a');
      expect(composerTrigger.getAttribute('href')).toBe('/profile');
    });
  });

  it('renders posts when loaded', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('Roommate needed in Dallas')).toBeDefined();
      expect(screen.getByText('Looking for a roommate.')).toBeDefined();
    });
  });

  it('shows error message when posts fail to load', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ error: new Error('DB error') });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText(/Could not load posts/)).toBeDefined();
    });
  });

  it('renders the TagFilterBar', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    feedMocks.getTagsMock.mockResolvedValue({
      data: [{ id: 'tag-1', slug: 'housing', name: 'Housing' }],
    });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByTestId('tag-filter-bar')).toBeDefined();
    });
  });

  it('passes selected tag slugs from URL query to tag filter', async () => {
    feedMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { tags: 'housing' },
      isReady: true,
    });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    feedMocks.getTagsMock.mockResolvedValue({
      data: [{ id: 'tag-1', slug: 'housing', name: 'Housing' }],
    });
    render(<FeedPage />);
    // Posts should be fetched with the housing filter
    await waitFor(() => {
      expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenCalledWith(
        expect.anything(),
        '19100',
        ['housing'],
        50
      );
    });
  });

  it('refetches posts with no filter when All tag is pressed', async () => {
    feedMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { tags: 'housing' },
      isReady: true,
    });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    feedMocks.getTagsMock.mockResolvedValue({
      data: [{ id: 'tag-1', slug: 'housing', name: 'Housing' }],
    });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('All')).toBeDefined());
    fireEvent.click(screen.getByText('All'));
    await waitFor(() => {
      expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenCalledWith(
        expect.anything(),
        '19100',
        undefined,
        50
      );
    });
  });

  it('shows like count on posts', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText(/3/)).toBeDefined();
    });
  });

  it('shows author name on post card', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Bikal Shrestha').length).toBeGreaterThan(0);
    });
  });

  it('shows Local badge for non-global post', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('📍 Local')).toBeDefined();
    });
  });

  it('shows Global badge for global post', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({
      data: [{ ...mockPosts[0], is_global: true }],
    });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('🌐 Global')).toBeDefined();
    });
  });
});
