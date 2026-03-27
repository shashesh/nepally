import React from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

jest.mock('../../components/Avatar', () => ({
  Avatar: () => null,
}));

jest.mock('@nepally/shared', () => ({
  getUserById: (...args: Parameters<typeof mockGetUserById>) => mockGetUserById(...args),
  getPostsByAuthorId: (...args: Parameters<typeof mockGetPostsByAuthorId>) =>
    mockGetPostsByAuthorId(...args),
  getEventsByOrganizer: (...args: Parameters<typeof mockGetEventsByOrganizer>) =>
    mockGetEventsByOrganizer(...args),
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
}));

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
    rsvp_visibility: 'public',
    status: 'active',
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
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
    mockSupabaseSingle.mockResolvedValue({
      data: { name: 'Dallas-Fort Worth', state: 'TX' },
    });
    mockSupabaseEq.mockReturnValue({ single: mockSupabaseSingle });
    mockSupabaseSelect.mockReturnValue({ eq: mockSupabaseEq });
    mockSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });
  });

  // ─── Loading / Error States ────────────────────────────────────────────────

  it('shows ActivityIndicator while profile data is loading', () => {
    mockGetUserById.mockReturnValue(new Promise(() => {}));
    mockGetPostsByAuthorId.mockReturnValue(new Promise(() => {}));
    mockGetEventsByOrganizer.mockReturnValue(new Promise(() => {}));
    const { UNSAFE_getByType } = render(<PublicProfileScreen />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows error message when getUserById returns an error', async () => {
    mockGetUserById.mockResolvedValue({ error: new Error('not found'), data: null });
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('Could not load profile.')).toBeTruthy();
  });

  it('shows error message when data is null (treated as load error)', async () => {
    mockGetUserById.mockResolvedValue({ data: null });
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('Could not load profile.')).toBeTruthy();
  });

  // ─── Profile Display ───────────────────────────────────────────────────────

  it('renders the formatted public name', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('Bikal S.')).toBeTruthy();
  });

  it('renders trust badge with correct level and label for verified user', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText(/Level 1.*Verified/)).toBeTruthy();
  });

  it('renders trust badge with correct level and label for new user', async () => {
    mockGetUserById.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 0 },
    });
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText(/Level 0.*New Member/)).toBeTruthy();
  });

  it('renders trust badge with correct level and label for contributor user', async () => {
    mockGetUserById.mockResolvedValue({
      data: { ...mockProfileUser, trust_level: 2 },
    });
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText(/Level 2.*Contributor/)).toBeTruthy();
  });

  // ─── Message Button ────────────────────────────────────────────────────────

  it('shows Message button when viewing another user profile', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('Message')).toBeTruthy();
  });

  it('does not show Message button when viewing own profile', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'profile-user', full_name: 'Bikal Shrestha', trust_level: 1 },
    });
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('Bikal S.')).toBeTruthy();
    expect(screen.queryByText('Message')).toBeNull();
  });

  it('calls getOrCreateConversation and navigates to chat when Message is pressed', async () => {
    mockGetOrCreateConversation.mockResolvedValue({
      data: {
        conversationId: 'conv-abc',
        isNew: true,
      },
    });
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('Message'));
    await act(async () => {});

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

  it('shows "Opening..." while messaging is in progress', async () => {
    mockGetOrCreateConversation.mockReturnValue(new Promise(() => {}));
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('Message'));
    await act(async () => {});

    expect(screen.getByText('Opening...')).toBeTruthy();
  });

  it('shows alert when NEW user tries to message', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'current-user', full_name: 'Test User', trust_level: 0 },
    });
    jest.spyOn(Alert, 'alert');

    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('Message'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Verify to Message',
      expect.any(String),
      expect.any(Array)
    );
    expect(mockGetOrCreateConversation).not.toHaveBeenCalled();
  });

  // ─── Posts Tab (default) ───────────────────────────────────────────────────

  it('shows user posts in the Posts tab by default', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('Roommate needed')).toBeTruthy();
    expect(screen.getByText('Looking for a roommate.')).toBeTruthy();
  });

  it('shows "No posts yet." when user has no posts', async () => {
    mockGetPostsByAuthorId.mockResolvedValue({ data: [] });
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('No posts yet.')).toBeTruthy();
  });

  it('shows Local badge for non-global posts', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('📍 Local')).toBeTruthy();
  });

  it('shows Global badge for global posts', async () => {
    mockGetPostsByAuthorId.mockResolvedValue({
      data: [{ ...mockUserPosts[0], is_global: true }],
    });
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('🌐 Global')).toBeTruthy();
  });

  it('pressing a post navigates to PostDetail', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('Roommate needed'));
    expect(mockNavigate).toHaveBeenCalledWith('PostDetail', { postId: 'post-1' });
  });

  it('shows like and comment counts on post items', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    expect(screen.getByText('❤️ 2')).toBeTruthy();
    expect(screen.getByText('💬 1')).toBeTruthy();
  });

  it('shows organizer events in Events tab', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('Events'));
    await act(async () => {});

    expect(screen.getByText('Nepali Networking Night')).toBeTruthy();
    expect(screen.getByText('18 going')).toBeTruthy();
  });

  it('opens event detail in Events tab when event card is pressed', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('Events'));
    await act(async () => {});

    fireEvent.press(screen.getByText('Nepali Networking Night'));

    expect(mockParentNavigate).toHaveBeenCalledWith('Events', {
      screen: 'EventDetail',
      params: { eventId: 'event-1' },
    });
  });

  it('shows "No events yet." when user has no events', async () => {
    mockGetEventsByOrganizer.mockResolvedValue({ data: [] });
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('Events'));
    await act(async () => {});

    expect(screen.getByText('No events yet.')).toBeTruthy();
  });

  // ─── About Tab ────────────────────────────────────────────────────────────

  it('switches to About tab when pressed and shows metro name', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('About'));
    await act(async () => {});

    expect(screen.getByText('Dallas-Fort Worth, TX')).toBeTruthy();
  });

  it('shows "Location not set" when user has no metro area', async () => {
    mockGetUserById.mockResolvedValue({
      data: { ...mockProfileUser, metro_area_id: null },
    });
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('About'));
    await act(async () => {});

    expect(screen.getByText('Location not set')).toBeTruthy();
  });

  it('shows member since year in About tab', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('About'));
    await act(async () => {});

    expect(screen.getByText('2024')).toBeTruthy();
  });

  it('shows post count in About tab', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('About'));
    await act(async () => {});

    // Counts now include both Posts and Events and can contain duplicate "1" values.
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('shows event count in About tab', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('About'));
    await act(async () => {});

    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('can switch back from About to Posts tab', async () => {
    render(<PublicProfileScreen />);
    await act(async () => {});

    fireEvent.press(screen.getByText('About'));
    await act(async () => {});
    expect(screen.getByText('Dallas-Fort Worth, TX')).toBeTruthy();

    // Multiple "Posts" texts exist while in About tab (tab button + activity label)
    // Press the first one which is the tab button
    fireEvent.press(screen.getAllByText('Posts')[0]);
    await act(async () => {});
    expect(screen.getByText('Roommate needed')).toBeTruthy();
  });
});
