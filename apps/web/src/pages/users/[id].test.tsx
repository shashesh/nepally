import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const profilePageMocks = vi.hoisted(() => {
  const supabaseSingleMock = vi.fn();
  const supabaseEqMock = vi.fn(() => ({ single: supabaseSingleMock }));
  const supabaseSelectMock = vi.fn(() => ({ eq: supabaseEqMock }));
  const supabaseFromMock = vi.fn(() => ({ select: supabaseSelectMock }));

  return {
    useAuthMock: vi.fn(),
    useRouterMock: vi.fn(),
    getUserByIdMock: vi.fn(),
    getPostsByAuthorIdMock: vi.fn(),
    getEventsByOrganizerMock: vi.fn(),
    getActiveListingsBySellerMock: vi.fn(),
    getOrCreateConversationMock: vi.fn(),
    isFollowingMock: vi.fn(),
    getHelperScoreMock: vi.fn(),
    formatRelativeTimeMock: vi.fn(),
    supabaseSingleMock,
    supabaseEqMock,
    supabaseSelectMock,
    supabaseFromMock,
  };
});

vi.mock('../../hooks/useAuth', () => ({ useAuth: profilePageMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: profilePageMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: profilePageMocks.supabaseFromMock },
}));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getUserById: profilePageMocks.getUserByIdMock,
    getPostsByAuthorId: profilePageMocks.getPostsByAuthorIdMock,
    getEventsByOrganizer: profilePageMocks.getEventsByOrganizerMock,
    getActiveListingsBySeller: profilePageMocks.getActiveListingsBySellerMock,
    getOrCreateConversation: profilePageMocks.getOrCreateConversationMock,
    isFollowing: profilePageMocks.isFollowingMock,
    getHelperScore: profilePageMocks.getHelperScoreMock,
    HELPER_SCORE_VISIBILITY_THRESHOLD: 10,
    formatRelativeTime: profilePageMocks.formatRelativeTimeMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

const mockCurrentUser = {
  id: 'current-user',
  full_name: 'Test User',
  trust_level: 1,
  metro_area_id: '19100',
};

const mockProfileUser = {
  id: 'profile-user',
  full_name: 'Bikal Shrestha',
  trust_level: 1,
  metro_area_id: '19100',
  profile_photo: null,
  bio: null,
  created_at: '2024-01-15T00:00:00Z',
};

const mockUserPosts = [
  {
    id: 'post-1',
    title: 'Roommate needed',
    description: 'Looking for a roommate in Dallas.',
    author_id: 'profile-user',
    is_global: false,
    likes_count: 2,
    comments_count: 1,
    created_at: '2026-02-24T10:00:00Z',
  },
];

const mockUserEvents = [
  {
    id: 'event-1',
    title: 'Nepali Networking Night',
    description: 'Meet professionals in DFW.',
    event_type: 'career',
    start_date: '2026-04-01T18:00:00Z',
    end_date: null,
    location_name: 'Irving Community Hall',
    location_address: null,
    metro_area_id: '19100',
    is_global: false,
    organizer_id: 'profile-user',
    photo_url: null,
    rsvp_count: 18,
    interested_count: 0,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
  },
];

const mockUserListings = [
  {
    id: 'listing-1',
    title: 'IKEA desk, like new',
    description: 'Hardly used.',
    price: 80,
    owner_id: 'profile-user',
    status: 'active',
    category: { id: 'furniture', name: 'Furniture', emoji: '🛋️' },
    photos: [],
    is_global: false,
    created_at: '2026-03-15T12:00:00Z',
    refreshed_at: '2026-03-15T12:00:00Z',
    views_count: 5,
    saves_count: 1,
    contacts_count: 0,
  },
];

import PublicProfilePage from './[id].page';

describe('PublicProfilePage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    profilePageMocks.useRouterMock.mockReturnValue({
      query: { id: 'profile-user' },
      push: mockPush,
      replace: mockReplace,
    });
    profilePageMocks.useAuthMock.mockReturnValue({ user: mockCurrentUser });
    profilePageMocks.getUserByIdMock.mockResolvedValue({ data: mockProfileUser });
    profilePageMocks.getPostsByAuthorIdMock.mockResolvedValue({ data: mockUserPosts });
    profilePageMocks.getEventsByOrganizerMock.mockResolvedValue({ data: mockUserEvents });
    profilePageMocks.getActiveListingsBySellerMock.mockResolvedValue({
      data: mockUserListings,
    });
    profilePageMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
    profilePageMocks.isFollowingMock.mockResolvedValue({ data: false });
    profilePageMocks.getHelperScoreMock.mockResolvedValue({
      data: { userId: 'profile-user', helperScore: 0, helpfulComments: 0, likesReceivedOnOwnPosts: 0 },
    });
    // Wire up supabase chain for metro area query
    profilePageMocks.supabaseSingleMock.mockResolvedValue({
      data: { name: 'Dallas-Fort Worth', state: 'TX' },
    });
    profilePageMocks.supabaseEqMock.mockReturnValue({
      single: profilePageMocks.supabaseSingleMock,
    });
    profilePageMocks.supabaseSelectMock.mockReturnValue({
      eq: profilePageMocks.supabaseEqMock,
    });
    profilePageMocks.supabaseFromMock.mockReturnValue({
      select: profilePageMocks.supabaseSelectMock,
    });
  });

  // ─── Loading / Error States ────────────────────────────────────────────────

  it('shows an aria-busy skeleton while profile is being fetched', () => {
    profilePageMocks.getUserByIdMock.mockReturnValue(new Promise(() => {}));
    profilePageMocks.getPostsByAuthorIdMock.mockReturnValue(new Promise(() => {}));
    profilePageMocks.getActiveListingsBySellerMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<PublicProfilePage />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
  });

  it('shows error message when getUserById returns an error', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      error: new Error('not found'),
      data: null,
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/couldn.t find this member/i)).toBeDefined();
    });
  });

  it('shows error message when data is null (no data treated as error)', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({ data: null });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/couldn.t find this member/i)).toBeDefined();
    });
  });

  it('does not call getUserById when router query ID is not set', () => {
    profilePageMocks.useRouterMock.mockReturnValue({
      query: {},
      push: mockPush,
      replace: mockReplace,
    });
    render(<PublicProfilePage />);
    expect(profilePageMocks.getUserByIdMock).not.toHaveBeenCalled();
  });

  // ─── Profile Display ───────────────────────────────────────────────────────

  it('renders the public display name using formatPublicName', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeDefined();
    });
  });

  it('renders trust chip for verified user (level 1)', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Level 1.*Verified/)).toBeDefined();
    });
  });

  it('renders trust chip for new user (level 0) and shows new-member hint', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 0 },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Level 0.*New/)).toBeDefined();
      expect(screen.getByText(/New to Nepally.*message carefully/i)).toBeDefined();
    });
  });

  it('renders trust chip for contributor user (level 2)', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 2 },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Level 2.*Contributor/)).toBeDefined();
    });
  });

  // ─── Bio ───────────────────────────────────────────────────────────────────

  it('renders the bio when one is set', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: {
        ...mockProfileUser,
        bio: 'Software eng in Dallas, happy to help new arrivals.',
      },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(
        screen.getByText('Software eng in Dallas, happy to help new arrivals.')
      ).toBeDefined();
    });
  });

  it('does not render a bio block on other users with no bio', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());
    expect(screen.queryByText(/Add a short bio/i)).toBeNull();
  });

  it('shows "Add a short bio" on own profile when bio is empty', async () => {
    profilePageMocks.useAuthMock.mockReturnValue({
      user: { ...mockCurrentUser, id: 'profile-user' },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Add a short bio/i)).toBeDefined();
    });
  });

  // ─── Message CTA ───────────────────────────────────────────────────────────

  it('renders Message CTA with first name when viewing another user', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Message Bikal S\./i })).toBeDefined();
    });
  });

  it('renders Edit profile link instead of Message CTA on own profile', async () => {
    profilePageMocks.useAuthMock.mockReturnValue({
      user: { ...mockCurrentUser, id: 'profile-user' },
    });
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());
    expect(screen.queryByRole('button', { name: /Message/ })).toBeNull();
    expect(screen.getByText(/Edit profile/i)).toBeDefined();
  });

  it('renders Sign-in Message label when unauthenticated', async () => {
    profilePageMocks.useAuthMock.mockReturnValue({ user: null });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign in to message/i })).toBeDefined();
    });
  });

  it('calls getOrCreateConversation and navigates when Message CTA is clicked', async () => {
    profilePageMocks.getOrCreateConversationMock.mockResolvedValue({
      data: { conversationId: 'conv-abc', isNew: true },
    });
    render(<PublicProfilePage />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Message Bikal S\./i })).toBeDefined()
    );

    fireEvent.click(screen.getByRole('button', { name: /Message Bikal S\./i }));

    await waitFor(() => {
      expect(profilePageMocks.getOrCreateConversationMock).toHaveBeenCalledWith(
        expect.anything(),
        'current-user',
        'Test User',
        'profile-user',
        'Bikal Shrestha'
      );
      expect(mockPush).toHaveBeenCalledWith('/messages/conv-abc');
    });
  });

  it('redirects to /login when unauthenticated user clicks Message CTA', async () => {
    profilePageMocks.useAuthMock.mockReturnValue({ user: null });
    render(<PublicProfilePage />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Sign in to message/i })).toBeDefined()
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign in to message/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('swaps CTA label to "Opening conversation…" while messaging', async () => {
    profilePageMocks.getOrCreateConversationMock.mockReturnValue(new Promise(() => {}));
    render(<PublicProfilePage />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Message Bikal S\./i })).toBeDefined()
    );
    fireEvent.click(screen.getByRole('button', { name: /Message Bikal S\./i }));
    await waitFor(() => {
      expect(screen.getByText(/Opening conversation/i)).toBeDefined();
    });
  });

  // ─── Posts Tab (default) ───────────────────────────────────────────────────

  it('shows posts tab content by default', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Roommate needed')).toBeDefined();
      expect(screen.getByText('Looking for a roommate in Dallas.')).toBeDefined();
    });
  });

  it('shows an empty state using the first name when user has no posts', async () => {
    profilePageMocks.getPostsByAuthorIdMock.mockResolvedValue({ data: [] });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Bikal.*hasn.t posted anything/i)).toBeDefined();
    });
  });

  it('renders a Local text chip for non-global post (no emoji)', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Local')).toBeDefined();
    });
    expect(screen.queryByText(/📍/)).toBeNull();
  });

  it('renders a Global text chip for global post', async () => {
    profilePageMocks.getPostsByAuthorIdMock.mockResolvedValue({
      data: [{ ...mockUserPosts[0], is_global: true }],
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Global')).toBeDefined();
    });
  });

  it('post items link to post detail page', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      const postLink = screen.getByText('Roommate needed').closest('a');
      expect(postLink?.getAttribute('href')).toBe('/posts/post-1');
    });
  });

  // ─── Events Tab ────────────────────────────────────────────────────────────

  it('shows organizer events in Events tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: /^Events/ }));

    await waitFor(() => {
      expect(screen.getByText('Nepali Networking Night')).toBeDefined();
      expect(screen.getByText('18 goings')).toBeDefined();
    });
  });

  it('shows empty events state with first name', async () => {
    profilePageMocks.getEventsByOrganizerMock.mockResolvedValue({ data: [] });
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: /^Events/ }));

    await waitFor(() => {
      expect(screen.getByText(/Bikal.*hasn.t organized any events/i)).toBeDefined();
    });
  });

  // ─── Listings Tab (new) ────────────────────────────────────────────────────

  it('shows active listings in the Listings tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: /^Listings/ }));

    await waitFor(() => {
      expect(screen.getByText('IKEA desk, like new')).toBeDefined();
      expect(screen.getByText('$80')).toBeDefined();
    });
  });

  it('shows empty listings state for other users', async () => {
    profilePageMocks.getActiveListingsBySellerMock.mockResolvedValue({ data: [] });
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: /^Listings/ }));

    await waitFor(() => {
      expect(screen.getByText(/Bikal has no active listings/i)).toBeDefined();
    });
  });

  it('listing items link to the listing detail page', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: /^Listings/ }));

    await waitFor(() => {
      const listingLink = screen.getByText('IKEA desk, like new').closest('a');
      expect(listingLink?.getAttribute('href')).toBe('/marketplace/listing/listing-1');
    });
  });

  // ─── About Tab ─────────────────────────────────────────────────────────────

  it('shows metro area location in About tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() =>
      // metro shows in the header meta row too, so wait until it's rendered there
      expect(screen.getAllByText('Dallas-Fort Worth, TX').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getByRole('tab', { name: 'About' }));

    await waitFor(() => {
      // now both header meta + About row contain it
      expect(screen.getAllByText('Dallas-Fort Worth, TX').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows "Not set" in About tab when user has no metro area', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: { ...mockProfileUser, metro_area_id: null },
    });
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: 'About' }));

    await waitFor(() => {
      expect(screen.getByText('Not set')).toBeDefined();
    });
  });

  it('shows member since year in About tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: 'About' }));

    await waitFor(() => {
      expect(screen.getByText('2024')).toBeDefined();
    });
  });

  it('About tab lists all activity counts including listings', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: 'About' }));

    await waitFor(() => {
      // Row labels in the About section are unique — tab labels now include a nested count.
      expect(screen.getByText('Active listings')).toBeDefined();
      expect(screen.getByText('Events organized')).toBeDefined();
      // The bare "Posts" label only appears in the About row (tab reads "Posts 1").
      expect(screen.getAllByText('Posts').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('can switch back from About tab to Posts tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: 'About' }));
    await waitFor(() =>
      expect(screen.getAllByText('Dallas-Fort Worth, TX').length).toBeGreaterThan(0)
    );

    fireEvent.click(screen.getByRole('tab', { name: /^Posts/ }));
    await waitFor(() => {
      expect(screen.getByText('Roommate needed')).toBeDefined();
    });
  });

  // ─── Follow button, counts, and identity chips ────────────────────────────

  it('renders follow button, counts, and identity chips', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: {
        ...mockProfileUser,
        id: 'target-1',
        hometown_district: 'Pokhara',
        college: 'Pulchowk',
        years_in_us: 6,
        languages: ['nepali', 'newari'],
        follower_count: 12,
        following_count: 4,
      },
    });
    profilePageMocks.useRouterMock.mockReturnValue({
      query: { id: 'target-1' },
      push: vi.fn(),
      replace: vi.fn(),
    });
    profilePageMocks.useAuthMock.mockReturnValue({ user: { ...mockCurrentUser, id: 'viewer-1' } });

    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    expect(screen.getByTestId('follow-button')).toBeDefined();
    expect(screen.getByText(/12 followers/)).toBeDefined();
    expect(screen.getByText(/4 following/)).toBeDefined();
    expect(screen.getByText('Pokhara')).toBeDefined();
    expect(screen.getByText('Pulchowk')).toBeDefined();
    expect(screen.getByText('6 years in US')).toBeDefined();
  });

  it('hides identity chips that are empty', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: {
        ...mockProfileUser,
        id: 'target-2',
        hometown_district: null,
        college: null,
        years_in_us: null,
        languages: [],
        follower_count: 0,
        following_count: 0,
      },
    });
    profilePageMocks.useRouterMock.mockReturnValue({
      query: { id: 'target-2' },
      push: vi.fn(),
      replace: vi.fn(),
    });
    profilePageMocks.useAuthMock.mockReturnValue({ user: { ...mockCurrentUser, id: 'viewer-1' } });

    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    expect(screen.queryByText(/years in US/)).toBeNull();
  });

  // ─── Helper Score Badge ────────────────────────────────────────────────────

  it('renders the helper badge when score >= threshold', async () => {
    profilePageMocks.getHelperScoreMock.mockResolvedValue({
      data: {
        userId: 'profile-user',
        helperScore: 42,
        helpfulComments: 15,
        likesReceivedOnOwnPosts: 12,
      },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Helped 42 people this year/)).toBeDefined();
    });
  });

  it('hides the helper badge when score < threshold', async () => {
    profilePageMocks.getHelperScoreMock.mockResolvedValue({
      data: {
        userId: 'profile-user',
        helperScore: 4,
        helpfulComments: 2,
        likesReceivedOnOwnPosts: 0,
      },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      // Sanity: page loaded — "Bikal S." appears in some header
      expect(screen.queryAllByText(/Bikal S\./).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Helped \d+ people this year/)).toBeNull();
  });
});
