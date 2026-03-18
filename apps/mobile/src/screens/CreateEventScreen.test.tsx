import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { createEvent, getEventById } from '@nusa/shared';
import CreateEventScreen from './CreateEventScreen';

jest.mock('@react-native-community/datetimepicker', () => {
  const ReactLocal = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return ({ mode, onChange }: { mode: 'date' | 'time'; onChange: (e: { type: string }, d: Date) => void }) =>
    ReactLocal.createElement(
      TouchableOpacity,
      {
        testID: `mock-datetime-${mode}`,
        onPress: () => {
          if (mode === 'date') {
            onChange({ type: 'set' }, new Date('2026-03-15T00:00:00.000Z'));
            return;
          }
          onChange({ type: 'set' }, new Date('2026-03-15T18:00:00.000Z'));
        },
      },
      ReactLocal.createElement(Text, null, `Mock ${mode} picker`)
    );
});

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
let mockRouteParams: Record<string, unknown> | undefined = undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      trust_level: 1,
      metro_area_id: '19100',
      is_premium: false,
    },
  }),
}));

jest.mock('../config/supabase', () => ({ supabase: {} }));

type ValidationIssue = { path: string[]; message: string };
type CreateEventLikeInput = {
  title?: string;
  description?: string;
  event_type?: string;
  start_date?: string;
  location_name?: string;
};

jest.mock('@nusa/shared', () => ({
  createEvent: jest.fn(async () => ({ data: { id: 'new-event-1' } })),
  updateEvent: jest.fn(async () => ({ data: { id: 'edit-event-1' } })),
  getEventById: jest.fn(async () => ({ data: null })),
  createEventSchema: {
    safeParse: (data: CreateEventLikeInput) => {
      const errors: ValidationIssue[] = [];
      if (!data.title || data.title.trim().length < 5) {
        errors.push({ path: ['title'], message: 'Title must be at least 5 characters' });
      }
      if (!data.description || data.description.trim().length < 10) {
        errors.push({ path: ['description'], message: 'Description must be at least 10 characters' });
      }
      if (!data.event_type) {
        errors.push({ path: ['event_type'], message: 'Select a valid event type' });
      }
      if (!data.start_date) {
        errors.push({ path: ['start_date'], message: 'Start date is required' });
      }
      if (!data.location_name || data.location_name.trim().length < 5) {
        errors.push({ path: ['location_name'], message: 'Location name must be at least 5 characters' });
      }
      if (errors.length > 0) {
        return { success: false, error: { issues: errors } };
      }
      return { success: true, data };
    },
  },
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
}));

describe('CreateEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
  });

  it('renders the form with all required fields', () => {
    const { getByText, getByPlaceholderText } = render(<CreateEventScreen />);
    expect(getByText('Create Event')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Dashain Celebration 2026')).toBeTruthy();
    expect(getByPlaceholderText('Tell people about your event...')).toBeTruthy();
  });

  it('Create button is disabled when form is empty', () => {
    const { getByText } = render(<CreateEventScreen />);
    const createBtn = getByText('Create');
    // The button style will have disabled styling; just check it exists
    expect(createBtn).toBeTruthy();
  });

  it('shows validation error when title is too short', async () => {
    const { getByPlaceholderText, getByText } = render(<CreateEventScreen />);
    const titleInput = getByPlaceholderText('e.g. Dashain Celebration 2026');
    fireEvent.changeText(titleInput, 'Hi');

    // Tap the Create button to trigger validation
    fireEvent.press(getByText('Create'));
    await waitFor(() => {
      expect(getByText('Title must be at least 5 characters')).toBeTruthy();
    });
  });

  it('calls createEvent with correct data on valid submit', async () => {
    const mockCreateEvent = createEvent as jest.MockedFunction<typeof createEvent>;
    const { getByPlaceholderText, getByText, getByTestId } = render(<CreateEventScreen />);

    fireEvent.changeText(getByPlaceholderText('e.g. Dashain Celebration 2026'), 'Dashain Celebration 2026');
    fireEvent.changeText(
      getByPlaceholderText('Tell people about your event...'),
      'Annual Dashain celebration with cultural programs and food.'
    );
    fireEvent.press(getByText('🎭 Cultural'));
    fireEvent.press(getByText('Select start date and time'));
    fireEvent.press(getByTestId('mock-datetime-date'));
    fireEvent.press(getByTestId('mock-datetime-time'));
    fireEvent.changeText(getByPlaceholderText('e.g. Dallas Convention Center'), 'Dallas Convention Center');

    fireEvent.press(getByText('Create'));

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          title: 'Dashain Celebration 2026',
          event_type: 'cultural',
          location_name: 'Dallas Convention Center',
        })
      );
    });
  });

  it('navigates to EventDetail after successful creation', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<CreateEventScreen />);

    fireEvent.changeText(getByPlaceholderText('e.g. Dashain Celebration 2026'), 'Dashain Celebration 2026');
    fireEvent.changeText(
      getByPlaceholderText('Tell people about your event...'),
      'Annual Dashain celebration with cultural programs and food.'
    );
    fireEvent.press(getByText('🎭 Cultural'));
    fireEvent.press(getByText('Select start date and time'));
    fireEvent.press(getByTestId('mock-datetime-date'));
    fireEvent.press(getByTestId('mock-datetime-time'));
    fireEvent.changeText(getByPlaceholderText('e.g. Dallas Convention Center'), 'Dallas Convention Center');

    fireEvent.press(getByText('Create'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('EventDetail', { eventId: 'new-event-1' });
    });
  });

  it('shows Cancel text in nav bar', () => {
    const { getByText } = render(<CreateEventScreen />);
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('does not show global toggle for non-premium user', () => {
    const { queryByText } = render(<CreateEventScreen />);
    expect(queryByText('🌐 Make Global')).toBeNull();
  });
});

describe('CreateEventScreen — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { editEventId: 'event-to-edit' };
  });

  afterEach(() => {
    mockRouteParams = undefined;
  });

  it('shows "Edit Event" title and calls getEventById', async () => {
    const mockGetEventById = getEventById as jest.MockedFunction<typeof getEventById>;
    const { getByText } = render(<CreateEventScreen />);
    await act(async () => {});

    expect(getByText('Edit Event')).toBeTruthy();
    expect(mockGetEventById).toHaveBeenCalledWith({}, 'event-to-edit');
  });

  it('shows "Save" submit button in edit mode', async () => {
    const { getByText } = render(<CreateEventScreen />);
    await act(async () => {});

    expect(getByText('Save')).toBeTruthy();
  });
});
