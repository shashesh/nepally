import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EventCard } from './EventCard';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@nepally/shared', () => ({
  formatPublicName: (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length < 2) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  },
}));

jest.mock('../Avatar', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView, Text: mockText } = jest.requireActual('react-native');
  return {
    Avatar: ({ name }: { name: string }) =>
      mockReact.createElement(mockView, { testID: 'avatar' }, mockReact.createElement(mockText, null, name)),
  };
});

jest.mock('./EventTypeBadge', () => {
  const mockReact = jest.requireActual('react');
  const { Text: mockText } = jest.requireActual('react-native');
  return {
    EventTypeBadge: ({ type }: { type: string }) =>
      mockReact.createElement(mockText, { testID: 'event-type-badge' }, type),
  };
});

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

const MOCK_EVENT = {
  id: 'event-1',
  title: 'Dashain Celebration 2026',
  description: 'Annual Dashain celebration.',
  event_type: 'cultural' as const,
  start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  metro_area_id: '19100',
  is_global: false,
  organizer_id: 'user-1',
  rsvp_count: 8,
  rsvp_visibility: 'public' as const,
  status: 'active' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  organizer: {
    id: 'user-1',
    full_name: 'Asha Kumar',
    trust_level: 1,
    profile_photo: null,
  },
};

describe('EventCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders event title', () => {
    const { getByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(getByText('Dashain Celebration 2026')).toBeTruthy();
  });

  it('renders location name', () => {
    const { getByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(getByText(/Dallas Convention Center/)).toBeTruthy();
  });

  it('renders RSVP count label — plural', () => {
    const { getByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(getByText('8 going')).toBeTruthy();
  });

  it('renders RSVP count label — singular', () => {
    const event = { ...MOCK_EVENT, rsvp_count: 1 };
    const { getByText } = render(<EventCard event={event} />);
    expect(getByText('1 going')).toBeTruthy();
  });

  it('renders organizer name (formatted)', () => {
    const { getByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(getByText('Asha K.')).toBeTruthy();
  });

  it('navigates to EventDetail on press', () => {
    const { getByText } = render(<EventCard event={MOCK_EVENT} />);
    fireEvent.press(getByText('Dashain Celebration 2026'));
    expect(mockNavigate).toHaveBeenCalledWith('EventDetail', { eventId: 'event-1' });
  });

  it('shows global badge for global event', () => {
    const event = { ...MOCK_EVENT, is_global: true };
    const { getByText } = render(<EventCard event={event} />);
    expect(getByText('🌐 Global')).toBeTruthy();
  });

  it('does not show global badge for local event', () => {
    const { queryByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(queryByText('🌐 Global')).toBeNull();
  });

  it('shows cancelled badge for cancelled event', () => {
    const event = { ...MOCK_EVENT, status: 'cancelled' as const };
    const { getByText } = render(<EventCard event={event} />);
    expect(getByText('Cancelled')).toBeTruthy();
  });

  it('renders type badge', () => {
    const { getByTestId } = render(<EventCard event={MOCK_EVENT} />);
    expect(getByTestId('event-type-badge')).toBeTruthy();
  });

  it('renders with past prop (does not crash)', () => {
    const pastEvent = { ...MOCK_EVENT, start_date: PAST };
    expect(() => render(<EventCard event={pastEvent} past />)).not.toThrow();
  });

  it('renders placeholder when no photo_url', () => {
    const { queryByText } = render(<EventCard event={MOCK_EVENT} />);
    // No photo — placeholder emoji rendered
    expect(queryByText('📅')).toBeTruthy();
  });

  it('shows Unknown organizer when organizer is missing', () => {
    const event = { ...MOCK_EVENT, organizer: undefined };
    const { getByText } = render(<EventCard event={event} />);
    expect(getByText('Unknown')).toBeTruthy();
  });

  it('renders multi-day date range when end_date differs', () => {
    const far = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const event = { ...MOCK_EVENT, end_date: far };
    const { getByText } = render(<EventCard event={event} />);
    // Should contain a dash between start and end date
    const dateEl = getByText(/–/);
    expect(dateEl).toBeTruthy();
  });
});
