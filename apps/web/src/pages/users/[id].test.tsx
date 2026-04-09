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
    getOrCreateConversationMock: vi.fn(),
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
    getOrCreateConversation: profilePageMocks.getOrCreateConversationMock,
    formatRelativeTime: profilePageMocks.formatRelativeTimeMock,
  };
});
vi.mock('../../components/Avatar', () => ({
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
    profilePageMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
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

  it('shows loading state while profile is being fetched', () => {
    profilePageMocks.getUserByIdMock.mockReturnValue(new Promise(() => {}));
    profilePageMocks.getPostsByAuthorIdMock.mockReturnValue(new Promise(() => {}));
    render(<PublicProfilePage />);
    expect(screen.getByText('Loading profile...')).toBeDefined();
  });

  it('shows error message when getUserById returns an error', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      error: new Error('not found'),
      data: null,
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Could not load profile.')).toBeDefined();
    });
  });

  it('shows error message when data is null (no data treated as error)', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({ data: null });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Could not load profile.')).toBeDefined();
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
      // formatPublicName('Bikal Shrestha') → 'Bikal S.'
      expect(screen.getByText('Bikal S.')).toBeDefined();
    });
  });

  it('renders trust badge for verified user (level 1)', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      // "✓ Level 1: Verified"
      expect(screen.getByText(/Level 1.*Verified/)).toBeDefined();
    });
  });

  it('renders trust badge for new user (level 0)', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 0 },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Level 0.*New/)).toBeDefined();
    });
  });

  it('renders trust badge for contributor user (level 2)', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 2 },
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Level 2.*Contributor/)).toBeDefined();
    });
  });

  // ─── Message Button ────────────────────────────────────────────────────────

  it('renders message button when viewing another user profile', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Message/ })).toBeDefined();
    });
  });

  it('does not render message button when viewing own profile', async () => {
    profilePageMocks.useAuthMock.mockReturnValue({
      user: { ...mockCurrentUser, id: 'profile-user' },
    });
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());
    expect(screen.queryByRole('button', { name: /Message/ })).toBeNull();
  });

  it('calls getOrCreateConversation and navigates when message button is clicked', async () => {
    profilePageMocks.getOrCreateConversationMock.mockResolvedValue({
      data: { conversationId: 'conv-abc', isNew: true },
    });
    render(<PublicProfilePage />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Message/ })).toBeDefined()
    );

    fireEvent.click(screen.getByRole('button', { name: /Message/ }));

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

  it('redirects to /login when unauthenticated user clicks message', async () => {
    profilePageMocks.useAuthMock.mockReturnValue({ user: null });
    render(<PublicProfilePage />);
    // No currentUser means isOwnProfile = false but no user - button still visible
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Message/ })).toBeDefined()
    );

    fireEvent.click(screen.getByRole('button', { name: /Message/ }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('shows loading state while messaging is in progress', async () => {
    profilePageMocks.getOrCreateConversationMock.mockReturnValue(new Promise(() => {}));
    render(<PublicProfilePage />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Message/ })).toBeDefined()
    );
    fireEvent.click(screen.getByRole('button', { name: /Message/ }));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Message/ });
      expect(btn.getAttribute('data-loading')).toBe('true');
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

  it('shows empty state when user has no posts', async () => {
    profilePageMocks.getPostsByAuthorIdMock.mockResolvedValue({ data: [] });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('No posts yet.')).toBeDefined();
    });
  });

  it('shows Local badge for non-global post', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('📍 Local')).toBeDefined();
    });
  });

  it('shows Global badge for global post', async () => {
    profilePageMocks.getPostsByAuthorIdMock.mockResolvedValue({
      data: [{ ...mockUserPosts[0], is_global: true }],
    });
    render(<PublicProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('🌐 Global')).toBeDefined();
    });
  });

  it('post items link to post detail page', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => {
      const postLink = screen.getByText('Roommate needed').closest('a');
      expect(postLink?.getAttribute('href')).toBe('/posts/post-1');
    });
  });

  it('shows organizer events in Events tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Events' }));

    await waitFor(() => {
      expect(screen.getByText('Nepali Networking Night')).toBeDefined();
      expect(screen.getByText('18 going')).toBeDefined();
    });
  });

  it('shows empty state when user has no events', async () => {
    profilePageMocks.getEventsByOrganizerMock.mockResolvedValue({ data: [] });
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Events' }));

    await waitFor(() => {
      expect(screen.getByText('No events yet.')).toBeDefined();
    });
  });

  // ─── About Tab ────────────────────────────────────────────────────────────

  it('switches to About tab and shows metro area location', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    await waitFor(() => {
      expect(screen.getByText('Dallas-Fort Worth, TX')).toBeDefined();
    });
  });

  it('shows "Not set" in About tab when user has no metro area', async () => {
    profilePageMocks.getUserByIdMock.mockResolvedValue({
      data: { ...mockProfileUser, metro_area_id: null },
    });
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    await waitFor(() => {
      expect(screen.getByText('Not set')).toBeDefined();
    });
  });

  it('shows member since year in About tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    await waitFor(() => {
      expect(screen.getByText('2024')).toBeDefined();
    });
  });

  it('shows post count in About tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    await waitFor(() => {
      // 1 post in mockUserPosts — the count "1" appears as the Posts value
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
  });

  it('shows event count in About tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    await waitFor(() => {
      // 1 event in mockUserEvents — the count "1" appears as the Events value
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
  });

  it('can switch back from About tab to Posts tab', async () => {
    render(<PublicProfilePage />);
    await waitFor(() => expect(screen.getByText('Bikal S.')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    await waitFor(() => expect(screen.getByText('Dallas-Fort Worth, TX')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Posts' }));
    await waitFor(() => {
      expect(screen.getByText('Roommate needed')).toBeDefined();
    });
  });
});
