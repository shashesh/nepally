import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EventCard } from './EventCard';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@nepally/shared', () => ({
  formatEventDateShort: jest.requireActual('@nepally/shared').formatEventDateShort,
  formatCount: jest.requireActual('@nepally/shared').formatCount,
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
  interested_count: 12,
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

  it('renders going count', () => {
    const { getByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(getByText(/8 going/)).toBeTruthy();
  });

  it('renders interested count', () => {
    const { getByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(getByText(/12 interested/)).toBeTruthy();
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

  it('renders cover placeholder emoji when no photo_url', () => {
    const { queryByText } = render(<EventCard event={MOCK_EVENT} />);
    expect(queryByText('📅')).toBeTruthy();
  });

  it('renders multi-day date range when end_date differs', () => {
    const far = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const event = { ...MOCK_EVENT, end_date: far };
    const { getByText } = render(<EventCard event={event} />);
    const dateEl = getByText(/–/);
    expect(dateEl).toBeTruthy();
  });

  it('shows Interested button when canInteract is true and event is active', () => {
    const { getByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse={null} />
    );
    expect(getByText('★ Interested')).toBeTruthy();
  });

  it('shows Going label when userResponse is going', () => {
    const { getByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse="going" />
    );
    expect(getByText('✓ Going')).toBeTruthy();
  });

  it('shows Interested label when userResponse is interested', () => {
    const { getByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse="interested" />
    );
    expect(getByText('★ Interested')).toBeTruthy();
  });

  it('opens response sheet when Interested button is pressed', () => {
    const { getByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse={null} onResponseChange={jest.fn()} />
    );
    fireEvent.press(getByText('★ Interested'));
    expect(getByText('Your response')).toBeTruthy();
  });

  it('calls onResponseChange with interested when sheet option selected', () => {
    const onResponseChange = jest.fn();
    const { getByText, getAllByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse={null} onResponseChange={onResponseChange} />
    );
    fireEvent.press(getByText('★ Interested'));
    // In the modal, press Interested option
    const interestedOptions = getAllByText('Interested');
    fireEvent.press(interestedOptions[interestedOptions.length - 1]);
    expect(onResponseChange).toHaveBeenCalledWith('event-1', 'interested');
  });

  it('calls onResponseChange with going when Going option selected', () => {
    const onResponseChange = jest.fn();
    const { getByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse={null} onResponseChange={onResponseChange} />
    );
    fireEvent.press(getByText('★ Interested'));
    fireEvent.press(getByText('Going'));
    expect(onResponseChange).toHaveBeenCalledWith('event-1', 'going');
  });

  it('shows Not Interested option when user already has a response', () => {
    const { getByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse="going" onResponseChange={jest.fn()} />
    );
    fireEvent.press(getByText('✓ Going'));
    expect(getByText('Not Interested')).toBeTruthy();
  });

  it('calls onResponseChange with null when Not Interested is pressed', () => {
    const onResponseChange = jest.fn();
    const { getByText } = render(
      <EventCard event={MOCK_EVENT} canInteract userResponse="going" onResponseChange={onResponseChange} />
    );
    fireEvent.press(getByText('✓ Going'));
    fireEvent.press(getByText('Not Interested'));
    expect(onResponseChange).toHaveBeenCalledWith('event-1', null);
  });

  it('does not show Interested button when canInteract is false', () => {
    const { queryByText } = render(
      <EventCard event={MOCK_EVENT} canInteract={false} />
    );
    expect(queryByText('★ Interested')).toBeNull();
  });

  it('does not show Interested button for past events', () => {
    const { queryByText } = render(
      <EventCard event={{ ...MOCK_EVENT, start_date: PAST }} canInteract past />
    );
    expect(queryByText('★ Interested')).toBeNull();
  });

  it('does not show Interested button for cancelled events', () => {
    const { queryByText } = render(
      <EventCard event={{ ...MOCK_EVENT, status: 'cancelled' as const }} canInteract />
    );
    expect(queryByText('★ Interested')).toBeNull();
  });

  it('formats large counts with K suffix', () => {
    const event = { ...MOCK_EVENT, rsvp_count: 1500, interested_count: 6200 };
    const { getByText } = render(<EventCard event={event} />);
    expect(getByText(/6\.2K interested/)).toBeTruthy();
    expect(getByText(/1\.5K going/)).toBeTruthy();
  });

  it('rounds counts of ten thousand and up down to whole thousands, as web does', () => {
    const event = { ...MOCK_EVENT, rsvp_count: 10500, interested_count: 0 };
    const { getByText } = render(<EventCard event={event} />);
    expect(getByText('0 interested · 10K going')).toBeTruthy();
  });
});
