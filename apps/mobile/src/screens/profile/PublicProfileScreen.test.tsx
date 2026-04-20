import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PublicProfileScreen from './PublicProfileScreen';

const mockUseAuth = jest.fn();
const mockUseRoute = jest.fn();
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));
const mockUseNavigation = jest.fn();
const mockGetUserById = jest.fn();
const mockGetPostsByAuthorId = jest.fn();
const mockGetEventsByOrganizer = jest.fn();
const mockGetActiveListingsBySeller = jest.fn();
const mockGetOrCreateConversation = jest.fn();

const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn(() => ({ single: mockSupabaseSingle }));
const mockSupabaseSelect = jest.fn(() => ({ eq: mockSupabaseEq }));
const mockSupabaseFrom = jest.fn(() => ({ select: mockSupabaseSelect }));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => mockUseNavigation(),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: (...args: Parameters<typeof mockSupabaseFrom>) => mockSupabaseFrom(...args),
  },
}));

jest.mock('@nepally/shared', () => ({
  getUserById: (...args: Parameters<typeof mockGetUserById>) => mockGetUserById(...args),
  getPostsByAuthorId: (...args: Parameters<typeof mockGetPostsByAuthorId>) =>
    mockGetPostsByAuthorId(...args),
  getEventsByOrganizer: (...args: Parameters<typeof mockGetEventsByOrganizer>) =>
    mockGetEventsByOrganizer(...args),
  getActiveListingsBySeller: (...args: Parameters<typeof mockGetActiveListingsBySeller>) =>
    mockGetActiveListingsBySeller(...args),
  getOrCreateConversation: (...args: Parameters<typeof mockGetOrCreateConversation>) =>
    mockGetOrCreateConversation(...args),
  formatRelativeTime: jest.fn(() => '2h ago'),
  formatPublicName: (name: string) => {
    if (!name || !name.trim()) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
  },
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
  getTrustLabel: (level: number) => {
    const labels: Record<number, string> = { 0: 'New', 1: 'Verified', 2: 'Contributor' };
    return labels[level] ?? 'Unknown';
  },
}));

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
    description: 'Looking for a roommate.',
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

describe('PublicProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: { userId: 'profile-user' } });
    mockUseAuth.mockReturnValue({
      user: { id: 'current-user', full_name: 'Test User', trust_level: 1 },
    });
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      getParent: mockGetParent,
    });
    mockGetUserById.mockResolvedValue({ data: mockProfileUser });
    mockGetPostsByAuthorId.mockResolvedValue({ data: mockUserPosts });
    mockGetEventsByOrganizer.mockResolvedValue({ data: mockUserEvents });
    mockGetActiveListingsBySeller.mockResolvedValue({ data: mockUserListings });
    mockSupabaseSingle.mockResolvedValue({
      data: { name: 'Dallas-Fort Worth', state: 'TX' },
    });
    mockSupabaseEq.mockReturnValue({ single: mockSupabaseSingle });
    mockSupabaseSelect.mockReturnValue({ eq: mockSupabaseEq });
    mockSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });
  });

  // ─── Error states ──────────────────────────────────────────────────────────

  it('shows error message when getUserById returns an error', async () => {
    mockGetUserById.mockResolvedValue({ error: new Error('not found'), data: null });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText(/couldn.t find this member/i)).toBeTruthy();
    });
  });

  it('shows error message when data is null', async () => {
    mockGetUserById.mockResolvedValue({ data: null });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText(/couldn.t find this member/i)).toBeTruthy();
    });
  });

  // ─── Profile display ───────────────────────────────────────────────────────

  it('renders the formatted public name', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });
  });

  it('renders trust chip for verified user (level 1)', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Level 1.*Verified/)).toBeTruthy();
    });
  });

  it('renders trust chip for new user (level 0) and shows new-member hint', async () => {
    mockGetUserById.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 0 },
    });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Level 0.*New/)).toBeTruthy();
      expect(screen.getByText(/New to Nepally.*message carefully/i)).toBeTruthy();
    });
  });

  it('renders trust chip for contributor user (level 2)', async () => {
    mockGetUserById.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 2 },
    });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Level 2.*Contributor/)).toBeTruthy();
    });
  });

  // ─── Bio ───────────────────────────────────────────────────────────────────

  it('renders bio when set', async () => {
    mockGetUserById.mockResolvedValue({
      data: { ...mockProfileUser, bio: 'Happy to help new arrivals in Dallas.' },
    });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(
        screen.getByText(/Happy to help new arrivals in Dallas/)
      ).toBeTruthy();
    });
  });

  // ─── Message CTA ───────────────────────────────────────────────────────────

  it('renders Message CTA with first name when viewing another user', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Message Bikal S.')).toBeTruthy();
    });
  });

  it('does not render Message CTA on own profile', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'profile-user', full_name: 'Bikal Shrestha', trust_level: 1 },
    });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });
    expect(screen.queryByText(/Message Bikal S\./)).toBeNull();
  });

  it('calls getOrCreateConversation and navigates when Message is pressed', async () => {
    mockGetOrCreateConversation.mockResolvedValue({
      data: { conversationId: 'conv-abc', isNew: true },
    });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Message Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Message Bikal S.'));

    await waitFor(() => {
      expect(mockGetOrCreateConversation).toHaveBeenCalledWith(
        expect.anything(),
        'current-user',
        'Test User',
        'profile-user',
        'Bikal Shrestha'
      );
      expect(mockParentNavigate).toHaveBeenCalledWith('Chat', {
        screen: 'MessageThread',
        params: expect.objectContaining({
          conversationId: 'conv-abc',
          otherUserId: 'profile-user',
          otherUserName: 'Bikal Shrestha',
        }),
      });
    });
  });

  it('swaps Message CTA to "Opening conversation…" while pending', async () => {
    mockGetOrCreateConversation.mockReturnValue(new Promise(() => {}));
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Message Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Message Bikal S.'));

    await waitFor(() => {
      expect(screen.getByText(/Opening conversation/i)).toBeTruthy();
    });
  });

  it('shows alert when NEW user tries to message', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'current-user', full_name: 'Test User', trust_level: 0 },
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Message Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Message Bikal S.'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Verify to message',
        expect.any(String),
        expect.any(Array)
      );
    });
    expect(mockGetOrCreateConversation).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  // ─── Posts tab (default) ───────────────────────────────────────────────────

  it('renders posts in the Posts tab by default', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Roommate needed')).toBeTruthy();
      expect(screen.getByText('Looking for a roommate.')).toBeTruthy();
    });
  });

  it('shows empty state for posts using the first name', async () => {
    mockGetPostsByAuthorId.mockResolvedValue({ data: [] });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Bikal.*hasn.t posted anything/i)).toBeTruthy();
    });
  });

  it('renders LOCAL text chip on non-global post (no emoji)', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('LOCAL')).toBeTruthy();
    });
    expect(screen.queryByText(/📍/)).toBeNull();
  });

  it('renders GLOBAL text chip on global post', async () => {
    mockGetPostsByAuthorId.mockResolvedValue({
      data: [{ ...mockUserPosts[0], is_global: true }],
    });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('GLOBAL')).toBeTruthy();
    });
  });

  it('pressing a post navigates to PostDetail', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Roommate needed')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Roommate needed'));
    expect(mockNavigate).toHaveBeenCalledWith('PostDetail', { postId: 'post-1' });
  });

  // ─── Events tab ────────────────────────────────────────────────────────────

  it('renders events when Events tab is pressed', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/^Events/));

    await waitFor(() => {
      expect(screen.getByText('Nepali Networking Night')).toBeTruthy();
      expect(screen.getByText('18 goings')).toBeTruthy();
    });
  });

  it('shows empty events state with first name', async () => {
    mockGetEventsByOrganizer.mockResolvedValue({ data: [] });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/^Events/));

    await waitFor(() => {
      expect(
        screen.getByText(/Bikal.*hasn.t organized any events/i)
      ).toBeTruthy();
    });
  });

  // ─── Listings tab (new) ────────────────────────────────────────────────────

  it('renders listings when Listings tab is pressed', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/^Listings/));

    await waitFor(() => {
      expect(screen.getByText('IKEA desk, like new')).toBeTruthy();
      expect(screen.getByText('$80')).toBeTruthy();
    });
  });

  it('shows empty listings state for other users', async () => {
    mockGetActiveListingsBySeller.mockResolvedValue({ data: [] });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/^Listings/));

    await waitFor(() => {
      expect(screen.getByText(/Bikal has no active listings/i)).toBeTruthy();
    });
  });

  it('pressing a listing navigates to Marketplace > ListingDetail', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/^Listings/));
    await waitFor(() => {
      expect(screen.getByText('IKEA desk, like new')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('IKEA desk, like new'));
    expect(mockParentNavigate).toHaveBeenCalledWith('Marketplace', {
      screen: 'ListingDetail',
      params: { listingId: 'listing-1' },
    });
  });

  // ─── About tab ─────────────────────────────────────────────────────────────

  it('shows metro name when switched to About tab', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      // metro name appears in header meta row first
      expect(screen.getAllByText('Dallas-Fort Worth, TX').length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getByText('About'));
    // Now both header + about row have it
    await waitFor(() => {
      expect(screen.getAllByText('Dallas-Fort Worth, TX').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows "Not set" in About tab when user has no metro area', async () => {
    mockGetUserById.mockResolvedValue({
      data: { ...mockProfileUser, metro_area_id: null },
    });
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('About'));
    await waitFor(() => {
      expect(screen.getByText('Not set')).toBeTruthy();
    });
  });

  it('shows member since year in About tab', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('About'));
    await waitFor(() => {
      expect(screen.getByText('2024')).toBeTruthy();
    });
  });

  it('shows ACTIVE LISTINGS row in About tab', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('About'));
    await waitFor(() => {
      expect(screen.getByText('ACTIVE LISTINGS')).toBeTruthy();
    });
  });

  it('can switch back from About to Posts tab', async () => {
    render(<PublicProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Bikal S.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('About'));
    await waitFor(() => {
      expect(screen.getAllByText('Dallas-Fort Worth, TX').length).toBeGreaterThan(0);
    });

    // Tab label renders as "Posts" + nested count; match with a regex prefix.
    fireEvent.press(screen.getByText(/^Posts/));
    await waitFor(() => {
      expect(screen.getByText('Roommate needed')).toBeTruthy();
    });
  });
});
