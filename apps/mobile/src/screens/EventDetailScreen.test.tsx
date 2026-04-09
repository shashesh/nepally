import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  getEventById,
  getEventAttendees,
  hasUserRsvp,
  rsvpToEvent,
  unrsvpFromEvent,
  cancelEvent,
  deleteEvent,
} from '@nepally/shared';
import type { Event, EventRsvp } from '@nepally/shared';
import EventDetailScreen from './EventDetailScreen';

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
const mockGoBack = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    getParent: mockGetParent,
  }),
  useRoute: () => ({ params: { eventId: 'event-1' } }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../config/supabase', () => ({ supabase: {} }));

jest.spyOn(Alert, 'alert');

// --- Dates ---
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
const NOW = new Date().toISOString();
const EDITED_AT = new Date(Date.now() + 120_000).toISOString(); // 2 min after created

// --- Mock Events ---
const BASE_EVENT: Event = {
  id: 'event-1',
  title: 'Dashain Celebration',
  description: 'Join us for the annual Dashain cultural celebration.',
  event_type: 'cultural',
  start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  location_address: '650 S Griffin St, Dallas, TX',
  metro_area_id: '19100',
  is_global: false,
  organizer_id: 'organizer-1',
  rsvp_count: 8,
  interested_count: 15,
  rsvp_visibility: 'public',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
  organizer: {
    id: 'organizer-1',
    full_name: 'Asha Kumar',
    trust_level: 1,
    profile_photo: null,
  },
};

const MOCK_ATTENDEES: EventRsvp[] = [
  {
    id: 'rsvp-1',
    event_id: 'event-1',
    user_id: 'attendee-1',
    status: 'going',
    created_at: NOW,
    user: { id: 'attendee-1', full_name: 'Ram Thapa', trust_level: 1, profile_photo: null },
  },
  {
    id: 'rsvp-2',
    event_id: 'event-1',
    user_id: 'attendee-2',
    status: 'going',
    created_at: NOW,
    user: { id: 'attendee-2', full_name: 'Sita Rai', trust_level: 2, profile_photo: null },
  },
];

jest.mock('@nepally/shared', () => ({
  getEventById: jest.fn(async () => ({ data: null })),
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
    cultural: 'Cultural',
    religious: 'Religious',
    social: 'Social',
    career: 'Career',
    other: 'Other',
  },
  EVENT_TYPE_ICONS: {
    cultural: '🎭',
    religious: '🕌',
    social: '🎉',
    career: '💼',
    other: '📌',
  },
}));

// --- Helpers ---
const mockGetEventById = getEventById as jest.MockedFunction<typeof getEventById>;
const mockHasUserRsvp = hasUserRsvp as jest.MockedFunction<typeof hasUserRsvp>;
const mockRsvpToEvent = rsvpToEvent as jest.MockedFunction<typeof rsvpToEvent>;
const mockUnrsvpFromEvent = unrsvpFromEvent as jest.MockedFunction<typeof unrsvpFromEvent>;
const mockCancelEvent = cancelEvent as jest.MockedFunction<typeof cancelEvent>;
const mockDeleteEvent = deleteEvent as jest.MockedFunction<typeof deleteEvent>;
const mockGetEventAttendees = getEventAttendees as jest.MockedFunction<typeof getEventAttendees>;

function setAuthUser(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-2', trust_level: 1, metro_area_id: '19100', ...overrides },
  });
}

function setOrganizerAuth() {
  mockUseAuth.mockReturnValue({
    user: { id: 'organizer-1', trust_level: 1, metro_area_id: '19100' },
  });
}

function setEvent(overrides: Partial<Event> = {}) {
  mockGetEventById.mockResolvedValue({ data: { ...BASE_EVENT, ...overrides } });
}

async function renderAndSettle() {
  const utils = render(<EventDetailScreen />);
  await act(async () => {});
  await act(async () => {});
  return utils;
}

describe('EventDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEvent();
    mockHasUserRsvp.mockResolvedValue({ data: false });
    setAuthUser();
  });

  // ─── Loading & Error States ─────────────────────────────────────────

  describe('loading and error states', () => {
    it('shows loading spinner initially', () => {
      // Don't resolve the promise yet — render synchronously
      mockGetEventById.mockReturnValue(new Promise(() => {}));
      const { queryByText } = render(<EventDetailScreen />);
      // The screen should not have event content yet
      expect(queryByText('Dashain Celebration')).toBeNull();
    });

    it('shows error message on fetch failure', async () => {
      mockGetEventById.mockResolvedValue({
        error: new Error('Network error'),
      } as { error: Error });

      const { getByText } = await renderAndSettle();
      expect(getByText('Network error')).toBeTruthy();
    });

    it('shows "Event not found" when data is undefined', async () => {
      mockGetEventById.mockResolvedValue({});

      const { getByText } = await renderAndSettle();
      expect(getByText('Event not found')).toBeTruthy();
    });

    it('shows Go Back button on error screen', async () => {
      mockGetEventById.mockResolvedValue({
        error: new Error('Oops'),
      } as { error: Error });

      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Go Back'));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('shows error message on thrown exception', async () => {
      mockGetEventById.mockRejectedValue(new Error('Unexpected crash'));

      const { getByText } = await renderAndSettle();
      expect(getByText('Unexpected crash')).toBeTruthy();
    });
  });

  // ─── Basic Event Rendering ──────────────────────────────────────────

  describe('event details rendering', () => {
    it('renders title, description, and location', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Dashain Celebration')).toBeTruthy();
      expect(getByText('Join us for the annual Dashain cultural celebration.')).toBeTruthy();
      expect(getByText('Dallas Convention Center')).toBeTruthy();
      expect(getByText('650 S Griffin St, Dallas, TX')).toBeTruthy();
    });

    it('renders organizer name using formatPublicName', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Asha K.')).toBeTruthy();
    });

    it('shows placeholder hero when no photo_url', async () => {
      const { getAllByText } = await renderAndSettle();
      // 📅 appears in hero placeholder AND in the date info row
      const emojiElements = getAllByText('📅');
      expect(emojiElements.length).toBe(2);
    });

    it('shows one fewer 📅 emoji when photo_url is present (no placeholder)', async () => {
      setEvent({ photo_url: 'https://example.com/photo.jpg' });
      const { getAllByText } = await renderAndSettle();
      // Only the date info row 📅 remains — hero placeholder is replaced by Image
      const emojiElements = getAllByText('📅');
      expect(emojiElements.length).toBe(1);
    });

    it('shows global badge when event is global', async () => {
      setEvent({ is_global: true });
      const { getByText } = await renderAndSettle();
      expect(getByText('🌐 Global')).toBeTruthy();
    });

    it('does not show global badge when event is local', async () => {
      const { queryByText } = await renderAndSettle();
      expect(queryByText('🌐 Global')).toBeNull();
    });

    it('shows (edited) label when event was edited', async () => {
      setEvent({ updated_at: EDITED_AT });
      const { getByText } = await renderAndSettle();
      expect(getByText(/\(edited\)/)).toBeTruthy();
    });

    it('does not show (edited) label when timestamps are close', async () => {
      const { queryByText } = await renderAndSettle();
      expect(queryByText(/\(edited\)/)).toBeNull();
    });
  });

  // ─── Status Banners ──────────────────────────────────────────────────

  describe('status banners', () => {
    it('shows cancelled banner for cancelled event', async () => {
      setEvent({ status: 'cancelled' });
      const { getByText } = await renderAndSettle();
      expect(getByText('This event has been cancelled.')).toBeTruthy();
    });

    it('shows past banner for past event', async () => {
      setEvent({ start_date: PAST });
      const { getByText } = await renderAndSettle();
      expect(getByText('This event has passed.')).toBeTruthy();
    });

    it('does not show past banner when event is cancelled (even if past)', async () => {
      setEvent({ status: 'cancelled', start_date: PAST });
      const { getByText, queryByText } = await renderAndSettle();
      expect(getByText('This event has been cancelled.')).toBeTruthy();
      expect(queryByText('This event has passed.')).toBeNull();
    });

    it('shows neither banner for active future event', async () => {
      const { queryByText } = await renderAndSettle();
      expect(queryByText('This event has been cancelled.')).toBeNull();
      expect(queryByText('This event has passed.')).toBeNull();
    });
  });

  // ─── Navigation ───────────────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates back on back button press', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('← Back'));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('navigates to organizer public profile on name press', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Asha K.'));
      expect(mockParentNavigate).toHaveBeenCalledWith('PublicProfileView', {
        userId: 'organizer-1',
      });
    });

    it('navigates to message thread on Message button press', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Message'));
      expect(mockParentNavigate).toHaveBeenCalledWith('MessageThread', {
        conversationId: '',
        otherUserId: 'organizer-1',
        otherUserName: 'Asha Kumar',
        otherUserTrustLevel: 1,
        otherUserPhotoUrl: null,
      });
    });
  });

  // ─── Organizer Actions ────────────────────────────────────────────────

  describe('organizer actions', () => {
    beforeEach(() => {
      setOrganizerAuth();
    });

    it('shows Edit, Cancel, Delete buttons for organizer', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Edit')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });

    it('navigates to CreateEvent with editEventId on Edit press', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Edit'));
      expect(mockNavigate).toHaveBeenCalledWith('CreateEvent', {
        editEventId: 'event-1',
      });
    });

    it('shows cancel confirmation alert on Cancel press', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Cancel'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cancel Event',
        'Cancel this event? Your attendees will see it as cancelled.',
        expect.any(Array),
      );
    });

    it('cancels event when user confirms cancel alert', async () => {
      mockCancelEvent.mockResolvedValue({});
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Cancel'));

      const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
      const destructiveButton = alertArgs[2].find(
        (btn: { text: string }) => btn.text === 'Cancel Event',
      );
      await act(async () => {
        await destructiveButton.onPress();
      });
      expect(mockCancelEvent).toHaveBeenCalledWith({}, 'event-1');
    });

    it('shows error alert when cancel fails', async () => {
      mockCancelEvent.mockResolvedValue({ error: new Error('Cancel failed') });
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Cancel'));

      const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
      const destructiveButton = alertArgs[2].find(
        (btn: { text: string }) => btn.text === 'Cancel Event',
      );
      await act(async () => {
        await destructiveButton.onPress();
      });
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Cancel failed');
    });

    it('shows delete confirmation alert on Delete press', async () => {
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Delete'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Event',
        'Delete this event? This cannot be undone.',
        expect.any(Array),
      );
    });

    it('deletes event and goes back when user confirms delete', async () => {
      mockDeleteEvent.mockResolvedValue({});
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Delete'));

      const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
      const destructiveButton = alertArgs[2].find(
        (btn: { text: string }) => btn.text === 'Delete Event',
      );
      await act(async () => {
        await destructiveButton.onPress();
      });
      expect(mockDeleteEvent).toHaveBeenCalledWith({}, 'event-1');
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('shows error alert when delete fails', async () => {
      mockDeleteEvent.mockResolvedValue({ error: new Error('Delete failed') });
      const { getByText } = await renderAndSettle();
      fireEvent.press(getByText('Delete'));

      const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
      const destructiveButton = alertArgs[2].find(
        (btn: { text: string }) => btn.text === 'Delete Event',
      );
      await act(async () => {
        await destructiveButton.onPress();
      });
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Delete failed');
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not show Message button when user is the organizer', async () => {
      const { queryByText } = await renderAndSettle();
      expect(queryByText('Message')).toBeNull();
    });
  });

  describe('non-organizer view', () => {
    it('does not show Edit, Cancel, Delete buttons', async () => {
      const { queryByText } = await renderAndSettle();
      expect(queryByText('Edit')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
      expect(queryByText('Delete')).toBeNull();
    });

    it('shows Message button for non-organizer verified user', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Message')).toBeTruthy();
    });
  });

  // ─── RSVP ─────────────────────────────────────────────────────────────

  describe('RSVP functionality', () => {
    it('shows RSVP button for verified non-organizer user', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('RSVP')).toBeTruthy();
    });

    it('shows hint text when not going', async () => {
      const { getByText } = await renderAndSettle();
      expect(getByText('Tap RSVP if you plan to attend.')).toBeTruthy();
    });

    it('calls rsvpToEvent on RSVP press and re-syncs from server', async () => {
      mockRsvpToEvent.mockResolvedValue({});

      const { getByText } = await renderAndSettle();

      // After initial render, set up mocks for the refresh call
      mockGetEventById.mockResolvedValue({ data: { ...BASE_EVENT, rsvp_count: 9 } });
      mockHasUserRsvp.mockResolvedValue({ data: true });

      await act(async () => {
        fireEvent.press(getByText('RSVP'));
      });
      await act(async () => {});
      await act(async () => {});

      expect(mockRsvpToEvent).toHaveBeenCalledWith({}, 'event-1', 'user-2');
      // Initial fetch + refresh
      expect(mockGetEventById).toHaveBeenCalledTimes(2);
      expect(mockHasUserRsvp).toHaveBeenCalledTimes(2);
    });

    it('calls unrsvpFromEvent when already going', async () => {
      mockHasUserRsvp.mockResolvedValue({ data: true });
      mockUnrsvpFromEvent.mockResolvedValue({});

      const { getByText } = await renderAndSettle();
      await act(async () => {
        fireEvent.press(getByText('Going ✓'));
      });
      await act(async () => {});

      expect(mockUnrsvpFromEvent).toHaveBeenCalledWith({}, 'event-1', 'user-2');
    });

    it('reverts RSVP state and shows error alert on failure', async () => {
      mockRsvpToEvent.mockResolvedValue({ error: new Error('RSVP failed') });
      // After failure, refreshRsvpState still runs
      mockGetEventById.mockResolvedValue({ data: BASE_EVENT });
      mockHasUserRsvp.mockResolvedValue({ data: false });

      const { getByText } = await renderAndSettle();
      await act(async () => {
        fireEvent.press(getByText('RSVP'));
      });
      await act(async () => {});

      expect(Alert.alert).toHaveBeenCalledWith('Error', "Couldn't update RSVP. Try again.");
    });

    it('shows "You are currently going." hint when going', async () => {
      mockHasUserRsvp.mockResolvedValue({ data: true });

      const { getByText } = await renderAndSettle();
      expect(getByText('You are currently going.')).toBeTruthy();
    });
  });

  // ─── RSVP State Variations ────────────────────────────────────────────

  describe('RSVP state variations', () => {
    it('does not show Message button for level 0 user', async () => {
      setAuthUser({ trust_level: 0 });
      const { queryByText } = await renderAndSettle();
      expect(queryByText('Message')).toBeNull();
    });
  });

  // ─── RSVP Visibility ──────────────────────────────────────────────────

  describe('RSVP visibility', () => {
    it('shows attendee count text when visibility is private', async () => {
      setEvent({ rsvp_visibility: 'private' });
      const { getByText } = await renderAndSettle();
      expect(getByText('8 going')).toBeTruthy();
    });
  });

  // ─── Attendees Modal ──────────────────────────────────────────────────

  describe('attendees modal', () => {
    it('fetches attendees when attendee stack is pressed', async () => {
      mockGetEventAttendees.mockResolvedValue({ data: MOCK_ATTENDEES });

      const { getByText } = await renderAndSettle();

      // The AttendeeAvatarStack renders a touchable with "N people going" text
      await act(async () => {
        fireEvent.press(getByText('8 people going'));
      });
      await act(async () => {});

      expect(mockGetEventAttendees).toHaveBeenCalledWith({}, 'event-1');
    });
  });

  // ─── No Auth ──────────────────────────────────────────────────────────

  describe('unauthenticated user', () => {
    it('renders event details without RSVP check when no user', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const { getByText } = await renderAndSettle();
      expect(getByText('Dashain Celebration')).toBeTruthy();
      // hasUserRsvp should not be called without a user
      expect(mockHasUserRsvp).not.toHaveBeenCalled();
    });
  });
});
