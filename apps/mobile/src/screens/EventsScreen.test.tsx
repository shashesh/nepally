import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { getEventsByMetro } from '@nepally/shared';
import type { Event } from '@nepally/shared';
import EventsScreen from './EventsScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children: unknown }) =>
      mockReact.createElement(mockView, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../config/supabase', () => ({ supabase: {} }));

// --- Dates ---
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
const NOW = new Date().toISOString();

// --- Mock Events ---
const CULTURAL_EVENT: Event = {
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
  interested_count: 10,
  rsvp_visibility: 'public',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
  organizer: { id: 'user-1', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
};

const CAREER_EVENT: Event = {
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
  interested_count: 30,
  rsvp_visibility: 'public',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
  organizer: { id: 'user-2', full_name: 'Rohan Shrestha', trust_level: 1, profile_photo: null },
};

const PAST_EVENT: Event = {
  ...CULTURAL_EVENT,
  id: 'e3',
  title: 'Past Tihar Meetup',
  start_date: PAST,
};

const EVENT_TYPE_LABELS = {
  cultural: 'Cultural',
  religious: 'Religious',
  social: 'Social',
  career: 'Career',
  other: 'Other',
};

jest.mock('@nepally/shared', () => ({
  getEventsByMetro: jest.fn(async () => ({ data: [] })),
  getUserEventResponses: jest.fn(async () => ({ data: {} })),
  setEventResponse: jest.fn(async () => ({})),
  removeEventResponse: jest.fn(async () => ({})),
  EVENT_TYPES: ['cultural', 'religious', 'social', 'career', 'other'],
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS: {
    cultural: '🎭',
    religious: '🕌',
    social: '🎉',
    career: '💼',
    other: '📌',
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

// --- Helpers ---
const mockGetEventsByMetro = getEventsByMetro as jest.MockedFunction<typeof getEventsByMetro>;

function setAuthUser(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-2', trust_level: 1, metro_area_id: '19100', ...overrides },
  });
}

function setEvents(events: Event[]) {
  mockGetEventsByMetro.mockResolvedValue({ data: events });
}

async function renderAndSettle() {
  const utils = render(<EventsScreen />);
  await act(async () => {});
  await act(async () => {});
  return utils;
}

describe('EventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthUser();
    setEvents([CULTURAL_EVENT, CAREER_EVENT]);
  });

  // ─── Loading & Error States ─────────────────────────────────────────

  describe('loading and error states', () => {
    it('shows loading skeletons before fetch resolves', () => {
      mockGetEventsByMetro.mockReturnValue(new Promise(() => {}));
      const { getByText, queryByText } = render(<EventsScreen />);
      expect(getByText('Events')).toBeTruthy();
      expect(queryByText('Dashain Celebration')).toBeNull();
    });

    it('shows error message on fetch failure', async () => {
      mockGetEventsByMetro.mockResolvedValue({ error: new Error('Network error') } as { error: Error });
      const { getByText } = await renderAndSettle();
      expect(getByText('Network error')).toBeTruthy();
    });

    it('shows Retry button on error', async () => {
      mockGetEventsByMetro.mockResolvedValue({ error: new Error('Failed') } as { error: Error });
      const { getByText } = await renderAndSettle();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('retries fetch when Retry button is pressed', async () => {
      mockGetEventsByMetro.mockResolvedValueOnce({ error: new Error('Failed') } as { error: Error });
      const { getByText } = await renderAndSettle();

      mockGetEventsByMetro.mockResolvedValueOnce({ data: [CULTURAL_EVENT] });

      await act(async () => {
        fireEvent.press(getByText('Retry'));
      });
      await act(async () => {});

      expect(mockGetEventsByMetro).toHaveBeenCalledTimes(2);
      expect(getByText('Dashain Celebration')).toBeTruthy();
    });

    it('stops loading without fetching when no metro_area_id', async () => {
      setAuthUser({ metro_area_id: '' });
      await renderAndSettle();
      expect(mockGetEventsByMetro).not.toHaveBeenCalled();
    });
  });

  // ─── Header & Create Button ─────────────────────────────────────────

  describe('header', () => {
    it('shows "Events" title', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Events')).toBeTruthy();
    });

    it('shows "+ Create" button for verified user (trust_level >= 1)', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('+ Create')).toBeTruthy();
    });

    it('hides "+ Create" button for level 0 user', async () => {
      setAuthUser({ trust_level: 0 });
      const { queryByText } = await renderAndSettle();
      expect(queryByText('+ Create')).toBeNull();
    });

    it('navigates to CreateEvent on "+ Create" press', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('+ Create'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateEvent', undefined);
    });
  });

  // ─── Event List Rendering ───────────────────────────────────────────

  describe('event list rendering', () => {
    it('renders all upcoming events', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Dashain Celebration')).toBeTruthy();
      expect(getByText('Career Networking Night')).toBeTruthy();
    });

    it('shows "Past Events" divider when past events exist', async () => {
      setEvents([CULTURAL_EVENT, PAST_EVENT]);
      const { getByText } = await renderAndSettle();
      expect(getByText('Past Events')).toBeTruthy();
    });

    it('does not show "Past Events" divider when all events are upcoming', async () => {
      const { queryByText } = await renderAndSettle();
      expect(queryByText('Past Events')).toBeNull();
    });

    it('renders past event titles', async () => {
      setEvents([CULTURAL_EVENT, PAST_EVENT]);
      const { getByText } = await renderAndSettle();
      expect(getByText('Past Tihar Meetup')).toBeTruthy();
    });
  });

  // ─── Empty State ────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows empty state when no events exist', async () => {
      setEvents([]);
      const { getByText } = await renderAndSettle();
      expect(getByText('No upcoming events')).toBeTruthy();
      expect(getByText('Check back soon!')).toBeTruthy();
    });

    it('shows filter-specific empty state when filter has no matches', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('🎉 Social'));
      expect(getByText('No Social events')).toBeTruthy();
    });
  });

  // ─── Filter Chips ──────────────────────────────────────────────────

  describe('filter chips', () => {
    it('renders all filter chips', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('🗓️ All')).toBeTruthy();
      expect(getByText('🎭 Cultural')).toBeTruthy();
      expect(getByText('🕌 Religious')).toBeTruthy();
      expect(getByText('🎉 Social')).toBeTruthy();
      expect(getByText('💼 Career')).toBeTruthy();
      expect(getByText('📌 Other')).toBeTruthy();
    });

    it('filters to only cultural events when Cultural chip is pressed', async () => {
      const { getByText, queryByText } = await renderAndSettle();
      fireEvent.press(getByText('🎭 Cultural'));
      expect(getByText('Dashain Celebration')).toBeTruthy();
      expect(queryByText('Career Networking Night')).toBeNull();
    });

    it('filters to only career events when Career chip is pressed', async () => {
      const { getByText, queryByText } = await renderAndSettle();
      fireEvent.press(getByText('💼 Career'));
      expect(getByText('Career Networking Night')).toBeTruthy();
      expect(queryByText('Dashain Celebration')).toBeNull();
    });

    it('restores all events when All chip is re-selected', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('💼 Career'));
      fireEvent.press(getByText('🗓️ All'));
      expect(getByText('Dashain Celebration')).toBeTruthy();
      expect(getByText('Career Networking Night')).toBeTruthy();
    });
  });

  // ─── Search Filter ──────────────────────────────────────────────────

  describe('search filter', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders search input', async () => {
      const { getByPlaceholderText } = await renderAndSettle();
      expect(getByPlaceholderText('Search events...')).toBeTruthy();
    });

    it('filters events by title when query is entered', async () => {
      const { getByPlaceholderText, queryByText } = await renderAndSettle();
      fireEvent.changeText(getByPlaceholderText('Search events...'), 'Dashain');
      jest.runAllTimers();
      await act(async () => {});
      expect(queryByText('Dashain Celebration')).toBeTruthy();
      expect(queryByText('Career Networking Night')).toBeNull();
    });

    it('shows empty state when search matches nothing', async () => {
      const { getByPlaceholderText, getByText } = await renderAndSettle();
      fireEvent.changeText(getByPlaceholderText('Search events...'), 'zzznomatch');
      jest.runAllTimers();
      await act(async () => {});
      expect(getByText('No events matching "zzznomatch"')).toBeTruthy();
    });
  });

  // ─── Level 0 Banner ─────────────────────────────────────────────────

  describe('level 0 banner', () => {
    beforeEach(() => {
      setAuthUser({ trust_level: 0 });
    });

    it('shows verification banner for level 0 user', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Verify your account to RSVP and create events.')).toBeTruthy();
    });

    it('dismisses banner when ✕ is pressed', async () => {
      const { getByText, queryByText } = await renderAndSettle();
      fireEvent.press(getByText('✕'));
      expect(queryByText('Verify your account to RSVP and create events.')).toBeNull();
    });

    it('does not show banner for verified user', async () => {
      setAuthUser({ trust_level: 1 });
      const { queryByText } = await renderAndSettle();
      expect(queryByText('Verify your account to RSVP and create events.')).toBeNull();
    });
  });

  // ─── Data Fetching ──────────────────────────────────────────────────

  describe('data fetching', () => {
    it('passes supabase client and metro ID to getEventsByMetro', async () => {
      await renderAndSettle();
      expect(mockGetEventsByMetro).toHaveBeenCalledWith({}, '19100');
    });

    it('uses different metro ID from user', async () => {
      setAuthUser({ metro_area_id: '35620' });
      await renderAndSettle();
      expect(mockGetEventsByMetro).toHaveBeenCalledWith({}, '35620');
    });
  });
});
