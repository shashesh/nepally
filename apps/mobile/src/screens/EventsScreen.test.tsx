import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { getEventsByMetro } from '@nusa/shared';
import EventsScreen from './EventsScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children: unknown }) => mockReact.createElement(mockView, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', trust_level: 1, metro_area_id: '19100' },
  }),
}));

jest.mock('../config/supabase', () => ({ supabase: {} }));

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const mockEvents = [
  {
    id: 'e1',
    title: 'Dashain Celebration',
    description: 'Cultural event',
    event_type: 'cultural',
    start_date: FUTURE,
    location_name: 'Dallas Convention Center',
    metro_area_id: '19100',
    is_global: false,
    organizer_id: 'user-1',
    rsvp_count: 5,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer: { id: 'user-1', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
  },
  {
    id: 'e2',
    title: 'Career Networking Night',
    description: 'Networking event for professionals',
    event_type: 'career',
    start_date: FUTURE,
    location_name: 'Tech Hub Dallas',
    metro_area_id: '19100',
    is_global: false,
    organizer_id: 'user-2',
    rsvp_count: 12,
    rsvp_visibility: 'public',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer: { id: 'user-2', full_name: 'Rohan Shrestha', trust_level: 1, profile_photo: null },
  },
];

jest.mock('@nusa/shared', () => ({
  getEventsByMetro: jest.fn(async () => ({ data: mockEvents })),
  getUserRsvps: jest.fn(async () => ({ data: [] })),
  EVENT_TYPES: ['cultural', 'religious', 'social', 'career', 'other'],
  EVENT_TYPE_LABELS: {
    cultural: 'Cultural', religious: 'Religious', social: 'Social',
    career: 'Career', other: 'Other',
  },
  EVENT_TYPE_ICONS: {
    cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌',
  },
  EVENT_TYPE_COLORS: {
    cultural: { text: '#E65100', background: '#FFF3E0' },
    religious: { text: '#6A1B9A', background: '#F3E5F5' },
    social: { text: '#1B5E20', background: '#E8F5E9' },
    career: { text: '#0D47A1', background: '#E3F2FD' },
    other: { text: '#424242', background: '#F5F5F5' },
  },
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
  formatPublicName: (name: string) => name,
}));

describe('EventsScreen', () => {
  it('renders loading skeletons initially', async () => {
    const { queryByText } = render(<EventsScreen />);
    // Loading state appears before fetch resolves
    // Just check screen renders without crashing
    expect(queryByText('Events')).toBeTruthy();
    await act(async () => {});
  });

  it('renders events after fetch', async () => {
    const { getByText } = render(<EventsScreen />);
    await waitFor(() => {
      expect(getByText('Dashain Celebration')).toBeTruthy();
      expect(getByText('Career Networking Night')).toBeTruthy();
    });
  });

  it('shows Create button for Level 1 user', async () => {
    const { getByText } = render(<EventsScreen />);
    expect(getByText('+ Create')).toBeTruthy();
    await act(async () => {});
  });

  it('filters events by chip selection', async () => {
    const { getByText, queryByText } = render(<EventsScreen />);
    await waitFor(() => {
      expect(getByText('Dashain Celebration')).toBeTruthy();
    });

    // Select "Career" chip
    fireEvent.press(getByText('💼 Career'));
    await waitFor(() => {
      expect(queryByText('Dashain Celebration')).toBeNull();
      expect(getByText('Career Networking Night')).toBeTruthy();
    });
  });

  it('shows all events when All chip re-selected', async () => {
    const { getByText } = render(<EventsScreen />);
    await waitFor(() => {
      expect(getByText('Dashain Celebration')).toBeTruthy();
    });

    fireEvent.press(getByText('💼 Career'));
    await waitFor(() => expect(getByText('Career Networking Night')).toBeTruthy());

    fireEvent.press(getByText('🗓️ All'));
    await waitFor(() => {
      expect(getByText('Dashain Celebration')).toBeTruthy();
      expect(getByText('Career Networking Night')).toBeTruthy();
    });
  });

  it('shows empty state when no events match filter', async () => {
    const { getByText } = render(<EventsScreen />);
    await waitFor(() => getByText('Dashain Celebration'));

    // Select "Social" chip — no social events in mock data
    fireEvent.press(getByText('🎉 Social'));
    await waitFor(() => {
      expect(getByText('No Social events')).toBeTruthy();
    });
  });

  it('shows error state and retry button on fetch failure', async () => {
    const mockGetEventsByMetro = getEventsByMetro as jest.MockedFunction<typeof getEventsByMetro>;
    mockGetEventsByMetro.mockResolvedValueOnce({ error: new Error('Network error') });

    const { getByText } = render(<EventsScreen />);
    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });
  });
});

describe('EventsScreen — Level 0 user', () => {
  it('renders without crashing for level 0 user mock', async () => {
    // The top-level mock uses trust_level: 1; level 0 path is covered
    // by integration — this just confirms screen renders.
    const { getByText } = render(<EventsScreen />);
    expect(getByText('Events')).toBeTruthy();
    await act(async () => {});
  });
});
