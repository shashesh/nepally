import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockTagFilterBarProps = {
  tags: Array<{ id: string; slug: string; name: string }>;
  selectedSlugs: string[];
  onTagToggle: (slug: string) => void;
  onAllPress: () => void;
};
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const feedMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useLocationMock: vi.fn(),
  useRouterMock: vi.fn(),
  getPostsByMetroAreaMock: vi.fn(),
  getTagsMock: vi.fn(),
  getUserLikedPostIdsMock: vi.fn(),
  getUserSavedPostIdsMock: vi.fn(),
  savePostMock: vi.fn(),
  unsavePostMock: vi.fn(),
  deletePostMock: vi.fn(),
  getOrCreateConversationMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
  notificationsShowMock: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: feedMocks.notificationsShowMock },
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
    getUserSavedPostIds: feedMocks.getUserSavedPostIdsMock,
    savePost: feedMocks.savePostMock,
    unsavePost: feedMocks.unsavePostMock,
    deletePost: feedMocks.deletePostMock,
    getOrCreateConversation: feedMocks.getOrCreateConversationMock,
    formatRelativeTime: feedMocks.formatRelativeTimeMock,
    TAG_EMOJI: { housing: '🏠', jobs: '💼' },
  };
});
vi.mock('../components/TagFilterBar', () => ({
  default: ({ tags, selectedSlugs: _selectedSlugs, onTagToggle, onAllPress }: MockTagFilterBarProps) =>
    React.createElement('div', { 'data-testid': 'tag-filter-bar' },
      React.createElement('button', { onClick: onAllPress }, 'All'),
      tags.map((t) =>
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
  default: ({ href, children, className }: MockLinkProps) =>
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

import { FeedPage } from './feed.page';

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
    feedMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: [] });
    feedMocks.savePostMock.mockResolvedValue({});
    feedMocks.unsavePostMock.mockResolvedValue({});
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
      expect(composerTrigger).toBeTruthy();
      expect(composerTrigger?.getAttribute('href')).toBe('/posts/create');
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
      expect(composerTrigger).toBeTruthy();
      expect(composerTrigger?.getAttribute('href')).toBe('/profile');
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

  // ─── Save feature tests ───────────────────────────────────

  it('renders save button for non-own post', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => {
      // mockPosts[0].author_id = 'user-2', current user = 'user-1' → save button shows
      expect(screen.getByLabelText('Save post')).toBeDefined();
    });
  });

  it('does not render save button for own post', async () => {
    const ownPost = { ...mockPosts[0], author_id: 'user-1' };
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [ownPost] });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.queryByLabelText('Save post')).toBeNull();
      expect(screen.queryByLabelText('Unsave post')).toBeNull();
    });
  });

  it('calls savePost when save button is clicked', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByLabelText('Save post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Save post'));

    await waitFor(() => {
      expect(feedMocks.savePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1');
    });
  });

  it('shows "Post saved." toast after saving', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByLabelText('Save post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Save post'));

    await waitFor(() => {
      expect(feedMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Post saved.' })
      );
    });
  });

  it('optimistically toggles save button to unsave after clicking save', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByLabelText('Save post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Save post'));

    await waitFor(() => {
      expect(screen.getByLabelText('Unsave post')).toBeDefined();
    });
  });

  it('calls unsavePost when save toggled off', async () => {
    // Start with the post already saved
    feedMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: ['post-1'] });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByLabelText('Unsave post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Unsave post'));

    await waitFor(() => {
      expect(feedMocks.unsavePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1');
    });
  });

  it('shows "Post unsaved." toast after unsaving', async () => {
    feedMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: ['post-1'] });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByLabelText('Unsave post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Unsave post'));

    await waitFor(() => {
      expect(feedMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Post unsaved.' })
      );
    });
  });

  it('reverts save state on API error', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    feedMocks.savePostMock.mockResolvedValue({ error: new Error('network error') });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByLabelText('Save post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Save post'));

    await waitFor(() => {
      // Should revert back to unsaved state
      expect(screen.getByLabelText('Save post')).toBeDefined();
    });
  });

  it('shows "Save Post" option in post menu for non-own post', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Save Post')).toBeDefined();
    });
  });

  it('shows "Unsave Post" in post menu when post is already saved', async () => {
    feedMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: ['post-1'] });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Unsave Post')).toBeDefined();
    });
  });

  // ─── Avatar dropdown: View Profile navigation ──────────────────────────────

  it('clicking avatar for non-own post opens dropdown with View Profile and Chat options', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    // mockPosts[0].author_id = 'user-2', current user = 'user-1' → non-own post
    fireEvent.click(screen.getByTestId('avatar'));

    await waitFor(() => {
      expect(screen.getByText('View Profile')).toBeDefined();
      expect(screen.getByText('Chat')).toBeDefined();
    });
  });

  it('clicking View Profile in avatar dropdown navigates to public profile page', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByTestId('avatar'));
    await waitFor(() => expect(screen.getByText('View Profile')).toBeDefined());

    fireEvent.click(screen.getByText('View Profile'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/users/user-2');
    });
  });
});
