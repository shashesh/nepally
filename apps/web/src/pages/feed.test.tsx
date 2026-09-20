import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode };

const feedMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useLocationMock: vi.fn(),
  useRouterMock: vi.fn(),
  getPostsByMetroAreaMock: vi.fn(),

  getUserLikedPostIdsMock: vi.fn(),
  getUserSavedPostIdsMock: vi.fn(),
  savePostMock: vi.fn(),
  unsavePostMock: vi.fn(),
  deletePostMock: vi.fn(),
  getOrCreateConversationMock: vi.fn(),
  createReportMock: vi.fn(),
  getUpcomingEventsByMetroMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
  notificationsShowMock: vi.fn(),
  getPulseCardsMock: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({ notifications: { show: feedMocks.notificationsShowMock } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: feedMocks.useAuthMock }));
vi.mock('../hooks/useLocation', () => ({ useLocation: feedMocks.useLocationMock }));
vi.mock('next/router', () => ({ useRouter: feedMocks.useRouterMock }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getPostsByMetroArea: feedMocks.getPostsByMetroAreaMock,
    getUserLikedPostIds: feedMocks.getUserLikedPostIdsMock,
    getUserSavedPostIds: feedMocks.getUserSavedPostIdsMock,
    savePost: feedMocks.savePostMock,
    unsavePost: feedMocks.unsavePostMock,
    deletePost: feedMocks.deletePostMock,
    getOrCreateConversation: feedMocks.getOrCreateConversationMock,
    createReport: feedMocks.createReportMock,
    getUpcomingEventsByMetro: feedMocks.getUpcomingEventsByMetroMock,
    formatRelativeTime: feedMocks.formatRelativeTimeMock,
    getPulseCards: feedMocks.getPulseCardsMock,
    TAG_EMOJI: { housing: '🏠', jobs: '💼' },
  };
});

vi.mock('../components/Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  // Forwards the ref and every other prop, so Mantine can render a Menu.Item
  // or Button as a link and still set role, handlers and classes on it.
  default: React.forwardRef<HTMLAnchorElement, MockLinkProps>(function MockLink({ href, children, ...rest }, ref) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
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

    feedMocks.getUserLikedPostIdsMock.mockResolvedValue({ data: [] });
    feedMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: [] });
    feedMocks.savePostMock.mockResolvedValue({});
    feedMocks.unsavePostMock.mockResolvedValue({});
    feedMocks.createReportMock.mockResolvedValue({ data: { id: 'report-1' } });
    feedMocks.getUpcomingEventsByMetroMock.mockResolvedValue({ data: [] });
    feedMocks.getPulseCardsMock.mockResolvedValue({
      data: { cards: [], computedAt: new Date().toISOString() },
    });
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
    feedMocks.useLocationMock.mockReturnValue({ activeLocation: null });
    render(<FeedPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding/zip');
      expect(feedMocks.getPostsByMetroAreaMock).not.toHaveBeenCalled();
    });
  });

  it('shows loading state while fetching posts', () => {
    feedMocks.getPostsByMetroAreaMock.mockReturnValue(new Promise(() => {}));
    render(<FeedPage />);
    expect(screen.getByText('Loading posts…')).toBeDefined();
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

  it('fetches posts filtered by tag slug from URL query', async () => {
    feedMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { tags: 'housing' },
      isReady: true,
    });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    render(<FeedPage />);
    await waitFor(() => {
      expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenCalledWith(
        expect.anything(),
        '19100',
        ['housing'],
        20,
        0
      );
    });
  });

  it('requests the first page only once when the URL already has tags', async () => {
    feedMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { tags: 'housing' },
      isReady: true,
    });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    render(<FeedPage />);

    await waitFor(() => expect(screen.getByText(/No posts yet/)).toBeDefined());
    expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenCalledTimes(1);
  });

  it('applies URL tags once the router becomes ready', async () => {
    feedMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: {},
      isReady: false,
    });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
    const { rerender } = render(<FeedPage />);
    await waitFor(() => expect(screen.getByText(/No posts yet/)).toBeDefined());
    expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenLastCalledWith(
      expect.anything(), '19100', undefined, 20, 0
    );

    feedMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { tags: 'jobs,housing' },
      isReady: true,
    });
    rerender(<FeedPage />);

    await waitFor(() => {
      expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenLastCalledWith(
        expect.anything(), '19100', ['jobs', 'housing'], 20, 0
      );
    });
    expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenCalledTimes(2);
  });

  it('reloads posts for a tag when its chip is clicked', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Housing' }));

    await waitFor(() => {
      expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenLastCalledWith(
        expect.anything(), '19100', ['housing'], 20, 0
      );
    });
    expect(mockReplace).toHaveBeenCalledWith(
      { pathname: '/feed', query: { tags: 'housing' } },
      undefined,
      { shallow: true }
    );
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());
  });

  it('shows the loading state and reloads posts when Retry is pressed', async () => {
    let resolveRetry: (value: unknown) => void = () => {};
    feedMocks.getPostsByMetroAreaMock
      .mockResolvedValueOnce({ error: new Error('DB error') })
      .mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve; }));
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText(/Could not load posts/)).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('Loading posts…')).toBeDefined();
    expect(screen.queryByText(/Could not load posts/)).toBeNull();

    resolveRetry({ data: mockPosts });
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());
    expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenCalledTimes(2);
  });

  it('ignores a superseded response when the metro changes mid-load', async () => {
    let resolveDallas: (value: unknown) => void = () => {};
    feedMocks.getPostsByMetroAreaMock
      .mockReturnValueOnce(new Promise((resolve) => { resolveDallas = resolve; }))
      .mockResolvedValueOnce({
        data: [{ ...mockPosts[0], id: 'post-2', title: 'Jobs fair in Austin' }],
      });
    const { rerender } = render(<FeedPage />);

    feedMocks.useLocationMock.mockReturnValue({
      activeLocation: { ...mockActiveLocation, metro_area_id: '12420', metro_name: 'Austin' },
    });
    rerender(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Jobs fair in Austin')).toBeDefined());

    await act(async () => {
      resolveDallas({ data: mockPosts });
    });

    expect(feedMocks.getPostsByMetroAreaMock).toHaveBeenLastCalledWith(
      expect.anything(), '12420', undefined, 20, 0
    );
    expect(screen.getByText('Jobs fair in Austin')).toBeDefined();
    expect(screen.queryByText('Roommate needed in Dallas')).toBeNull();
  });

  it('shows like count on posts', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('3 likes')).toBeDefined();
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
      expect(screen.getByText('Local · Dallas-Fort Worth')).toBeDefined();
    });
  });

  it('shows Global badge for global post', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({
      data: [{ ...mockPosts[0], is_global: true }],
    });
    render(<FeedPage />);
    await waitFor(() => {
      expect(screen.getByText('Global')).toBeDefined();
    });
  });

  // ─── Save feature tests ───────────────────────────────────

  it('shows Save Post option in post menu for non-own post', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Save Post')).toBeDefined();
    });
  });

  it('does not show Save Post option for own post', async () => {
    const ownPost = { ...mockPosts[0], author_id: 'user-1' };
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [ownPost] });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      // Own post menu shows Edit/Delete, not Save
      expect(screen.queryByText('Save Post')).toBeNull();
    });
  });

  describe('deleting your own post', () => {
    async function openDeleteDialog() {
      const ownPost = { ...mockPosts[0], author_id: 'user-1' };
      feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [ownPost] });
      render(<FeedPage />);
      await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

      fireEvent.click(screen.getByLabelText('Post options'));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete Post' }));
      await screen.findByText('Delete post');
    }

    it('asks before deleting, and does nothing when dismissed', async () => {
      await openDeleteDialog();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(feedMocks.deletePostMock).not.toHaveBeenCalled());
      expect(screen.getByText('Roommate needed in Dallas')).toBeDefined();
    });

    it('removes the post from the feed once confirmed', async () => {
      feedMocks.deletePostMock.mockResolvedValue({});
      await openDeleteDialog();

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(feedMocks.deletePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1'));
      await waitFor(() => expect(screen.queryByText('Roommate needed in Dallas')).toBeNull());
    });

    it('keeps the post and says so when the delete fails', async () => {
      feedMocks.deletePostMock.mockResolvedValue({ error: new Error('nope') });
      await openDeleteDialog();

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() =>
        expect(feedMocks.notificationsShowMock).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Failed to delete post. Please try again.' })
        )
      );
      expect(screen.getByText('Roommate needed in Dallas')).toBeDefined();
    });
  });

  it('calls savePost when Save Post menu item is clicked', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Save Post')).toBeDefined());
    fireEvent.click(screen.getByText('Save Post'));

    await waitFor(() => {
      expect(feedMocks.savePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1');
    });
  });

  it('shows "Post saved." toast after saving', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Save Post')).toBeDefined());
    fireEvent.click(screen.getByText('Save Post'));

    await waitFor(() => {
      expect(feedMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Post saved.' })
      );
    });
  });

  it('shows Unsave Post in menu after saving', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Save Post')).toBeDefined());
    fireEvent.click(screen.getByText('Save Post'));

    // Re-open menu to check updated text
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));

    await waitFor(() => {
      expect(screen.getByText('Unsave Post')).toBeDefined();
    });
  });

  it('calls unsavePost when Unsave Post menu item is clicked', async () => {
    feedMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: ['post-1'] });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Unsave Post')).toBeDefined());
    fireEvent.click(screen.getByText('Unsave Post'));

    await waitFor(() => {
      expect(feedMocks.unsavePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1');
    });
  });

  it('shows "Post unsaved." toast after unsaving', async () => {
    feedMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: ['post-1'] });
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Unsave Post')).toBeDefined());
    fireEvent.click(screen.getByText('Unsave Post'));

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
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Save Post')).toBeDefined());
    fireEvent.click(screen.getByText('Save Post'));

    // Re-open menu to verify it reverted back
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Save Post')).toBeDefined();
    });
  });

  it('opens report modal from post menu', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Report Post')).toBeDefined());

    fireEvent.click(screen.getByText('Report Post'));

    await waitFor(() => {
      expect(screen.getByText('Report post')).toBeDefined();
      expect(screen.getByText('Why are you reporting this post?')).toBeDefined();
    });
  });

  it('submits report reason and details from modal', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Report Post')).toBeDefined());
    fireEvent.click(screen.getByText('Report Post'));

    await waitFor(() => expect(screen.getByText('Report post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Scam or fraud'));
    fireEvent.change(screen.getByLabelText('Additional details (optional)'), {
      target: { value: 'Looks suspicious and asks for money upfront.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(feedMocks.createReportMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reported_by: 'user-1',
          target_type: 'post',
          target_id: 'post-1',
          reason: 'Scam',
          description: 'Looks suspicious and asks for money upfront.',
        })
      );
      expect(feedMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Thanks. Your report has been submitted for review.' })
      );
    });
  });

  // ─── Avatar dropdown: View Profile navigation ──────────────────────────────

  it('the author avatar opens a menu with View profile and Chat', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    // mockPosts[0].author_id = 'user-2', current user = 'user-1' → someone else's post
    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal Shrestha' }));

    expect(await screen.findByRole('menuitem', { name: 'View profile' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Chat' })).toBeDefined();
  });

  it('View profile links to the public profile', async () => {
    feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: mockPosts });
    render(<FeedPage />);
    await waitFor(() => expect(screen.getByText('Roommate needed in Dallas')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal Shrestha' }));

    const link = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(link.getAttribute('href')).toBe('/users/user-2');
  });

  describe('Upcoming Events widget', () => {
    const futureDate1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate2 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const mockEvents = [
      {
        id: 'event-1',
        title: 'Dashain Celebration 2026',
        location_name: 'Central Park, NYC',
        start_date: futureDate1,
        event_type: 'cultural',
        status: 'active',
      },
      {
        id: 'event-2',
        title: 'Tech Networking Night',
        location_name: 'Google Pier 57',
        start_date: futureDate2,
        event_type: 'career',
        status: 'active',
      },
    ];

    it('renders upcoming events when API returns events', async () => {
      feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
      feedMocks.getUpcomingEventsByMetroMock.mockResolvedValue({ data: mockEvents });
      render(<FeedPage />);

      await waitFor(() => expect(screen.getByText('Upcoming Events')).toBeDefined());
      expect(screen.getByText('Dashain Celebration 2026')).toBeDefined();
      expect(screen.getByText('Central Park, NYC')).toBeDefined();
      expect(screen.getByText('Tech Networking Night')).toBeDefined();
      expect(screen.getByText('Google Pier 57')).toBeDefined();
    });

    it('renders View All link pointing to /events', async () => {
      feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
      feedMocks.getUpcomingEventsByMetroMock.mockResolvedValue({ data: mockEvents });
      render(<FeedPage />);

      await waitFor(() => expect(screen.getByText('View All')).toBeDefined());
      const viewAllLink = screen.getByText('View All');
      expect(viewAllLink.closest('a')?.getAttribute('href')).toBe('/events');
    });

    it('renders event date block with month and day', async () => {
      feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
      feedMocks.getUpcomingEventsByMetroMock.mockResolvedValue({ data: mockEvents });
      render(<FeedPage />);

      await waitFor(() => expect(screen.getByText('Dashain Celebration 2026')).toBeDefined());

      const eventDate = new Date(futureDate1);
      const expectedMonth = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const expectedDay = eventDate.getDate().toString().padStart(2, '0');

      // Query within the first event card to avoid multiple matches
      const firstEventCard = screen.getByText('Dashain Celebration 2026').closest('a');
      expect(firstEventCard?.textContent).toContain(expectedMonth);
      expect(firstEventCard?.textContent).toContain(expectedDay);
    });

    it('event cards link to event detail pages', async () => {
      feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
      feedMocks.getUpcomingEventsByMetroMock.mockResolvedValue({ data: mockEvents });
      render(<FeedPage />);

      await waitFor(() => expect(screen.getByText('Dashain Celebration 2026')).toBeDefined());

      const eventLink = screen.getByText('Dashain Celebration 2026').closest('a');
      expect(eventLink?.getAttribute('href')).toBe('/events/event-1');
    });

    it('does not render events widget when no upcoming events', async () => {
      feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
      feedMocks.getUpcomingEventsByMetroMock.mockResolvedValue({ data: [] });
      render(<FeedPage />);

      // Wait for the page to settle — sponsored section should still render
      await waitFor(() => expect(screen.getByText('Himalayan Kitchen')).toBeDefined());
      expect(screen.queryByText('Upcoming Events')).toBeNull();
    });

    it('calls getUpcomingEventsByMetro with metro area ID and limit 3', async () => {
      feedMocks.getPostsByMetroAreaMock.mockResolvedValue({ data: [] });
      feedMocks.getUpcomingEventsByMetroMock.mockResolvedValue({ data: [] });
      render(<FeedPage />);

      await waitFor(() => {
        expect(feedMocks.getUpcomingEventsByMetroMock).toHaveBeenCalledWith(
          expect.anything(), // supabase client
          '19100',
          3
        );
      });
    });
  });
});
