import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { getEventById, hasUserRsvp, rsvpToEvent } from '@nusa/shared';
import type { Event } from '@nusa/shared';
import EventDetailScreen from './EventDetailScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children: unknown }) => mockReact.createElement(mockView, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, getParent: mockGetParent }),
  useRoute: () => ({ params: { eventId: 'event-1' } }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../config/supabase', () => ({ supabase: {} }));

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

const MOCK_EVENT: Event = {
  id: 'event-1',
  title: 'Dashain Celebration',
  description: 'Join us for the annual Dashain cultural celebration.',
  event_type: 'cultural',
  start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  location_address: '650 S Griffin St, Dallas, TX',
  metro_area_id: '19100',
  is_global: false,
  organizer_id: 'user-1',
  rsvp_count: 8,
  rsvp_visibility: 'public',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  organizer: {
    id: 'user-1',
    full_name: 'Asha Kumar',
    trust_level: 1,
    profile_photo: null,
  },
};

const CANCELLED_EVENT: Event = { ...MOCK_EVENT, status: 'cancelled' };
const PAST_EVENT: Event = { ...MOCK_EVENT, start_date: PAST };

jest.mock('@nusa/shared', () => ({
  getEventById: jest.fn(async () => ({ data: MOCK_EVENT })),
  getEventAttendees: jest.fn(async () => ({ data: [] })),
  hasUserRsvp: jest.fn(async () => ({ data: false })),
  rsvpToEvent: jest.fn(async () => ({})),
  unrsvpFromEvent: jest.fn(async () => ({})),
  cancelEvent: jest.fn(async () => ({})),
  deleteEvent: jest.fn(async () => ({})),
  formatPublicName: (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length < 2) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  },
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
  EVENT_TYPE_COLORS: {
    cultural: { text: '#E65100', background: '#FFF3E0' },
    religious: { text: '#6A1B9A', background: '#F3E5F5' },
    social: { text: '#1B5E20', background: '#E8F5E9' },
    career: { text: '#0D47A1', background: '#E3F2FD' },
    other: { text: '#424242', background: '#F5F5F5' },
  },
  EVENT_TYPE_LABELS: {
    cultural: 'Cultural', religious: 'Religious', social: 'Social',
    career: 'Career', other: 'Other',
  },
  EVENT_TYPE_ICONS: {
    cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌',
  },
}));

describe('EventDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getEventById as jest.MockedFunction<typeof getEventById>).mockResolvedValue({ data: MOCK_EVENT });
    (hasUserRsvp as jest.MockedFunction<typeof hasUserRsvp>).mockResolvedValue({ data: false });
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', trust_level: 1, metro_area_id: '19100' },
    });
  });

  it('renders event details after fetch', async () => {
    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => {
      expect(getByText('Dashain Celebration')).toBeTruthy();
      expect(getByText('Join us for the annual Dashain cultural celebration.')).toBeTruthy();
      expect(getByText('Dallas Convention Center')).toBeTruthy();
    });
  });

  it('shows RSVP button for non-organizer level 1 user', async () => {
    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => {
      expect(getByText('RSVP')).toBeTruthy();
    });
  });

  it('shows edit/cancel/delete buttons for organizer', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', trust_level: 1, metro_area_id: '19100' },
    });
    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => {
      expect(getByText('Edit')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });
  });

  it('shows cancelled banner for cancelled event', async () => {
    const mockGetEventById = getEventById as jest.MockedFunction<typeof getEventById>;
    mockGetEventById.mockResolvedValue({ data: CANCELLED_EVENT });

    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => {
      expect(getByText('This event has been cancelled.')).toBeTruthy();
    });
  });

  it('shows past banner for past event', async () => {
    const mockGetEventById = getEventById as jest.MockedFunction<typeof getEventById>;
    mockGetEventById.mockResolvedValue({ data: PAST_EVENT });

    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => {
      expect(getByText('This event has passed.')).toBeTruthy();
    });
  });

  it('navigates back on back button press', async () => {
    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => expect(getByText('← Back')).toBeTruthy());
    fireEvent.press(getByText('← Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows error state on fetch failure', async () => {
    const mockGetEventById = getEventById as jest.MockedFunction<typeof getEventById>;
    mockGetEventById.mockResolvedValue({ error: new Error('Not found') });

    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => {
      expect(getByText('Not found')).toBeTruthy();
    });
  });

  it('toggles RSVP on button press and re-syncs from server', async () => {
    const mockGetEventById = getEventById as jest.MockedFunction<typeof getEventById>;
    const mockHasUserRsvp = hasUserRsvp as jest.MockedFunction<typeof hasUserRsvp>;
    const mockRsvpToEvent = rsvpToEvent as jest.MockedFunction<typeof rsvpToEvent>;
    const { getByText } = render(<EventDetailScreen />);
    await waitFor(() => expect(getByText('RSVP')).toBeTruthy());

    fireEvent.press(getByText('RSVP'));
    await waitFor(() => {
      expect(mockRsvpToEvent).toHaveBeenCalledWith({}, 'event-1', 'user-2');
      expect(mockGetEventById).toHaveBeenCalledTimes(2);
      expect(mockHasUserRsvp).toHaveBeenCalledTimes(2);
    });
  });
});
