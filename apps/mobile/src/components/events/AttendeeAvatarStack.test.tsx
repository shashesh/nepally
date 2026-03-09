import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AttendeeAvatarStack } from './AttendeeAvatarStack';

jest.mock('@nusa/shared', () => ({
  formatPublicName: (name: string) => name,
}));

jest.mock('../Avatar', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    Avatar: ({ name }: { name: string }) =>
      mockReact.createElement(mockView, { testID: `avatar-${name}` }),
  };
});

const makeRsvp = (id: string, name: string) => ({
  id,
  event_id: 'event-1',
  user_id: `user-${id}`,
  created_at: new Date().toISOString(),
  user: { id: `user-${id}`, full_name: name, trust_level: 1, profile_photo: null },
});

describe('AttendeeAvatarStack', () => {
  it('shows "Be the first to RSVP!" when totalCount is 0', () => {
    const { getByText } = render(
      <AttendeeAvatarStack attendees={[]} totalCount={0} />
    );
    expect(getByText('Be the first to RSVP!')).toBeTruthy();
  });

  it('shows "1 person going" when totalCount is 1', () => {
    const attendees = [makeRsvp('1', 'Alice Tamang')];
    const { getByText } = render(
      <AttendeeAvatarStack attendees={attendees} totalCount={1} />
    );
    expect(getByText('1 person going')).toBeTruthy();
  });

  it('shows "N people going" when totalCount > 1', () => {
    const attendees = [makeRsvp('1', 'Alice'), makeRsvp('2', 'Bob')];
    const { getByText } = render(
      <AttendeeAvatarStack attendees={attendees} totalCount={5} />
    );
    expect(getByText('5 people going')).toBeTruthy();
  });

  it('calls onPress when there are attendees and row is pressed', () => {
    const onPress = jest.fn();
    const attendees = [makeRsvp('1', 'Alice')];
    const { getByText } = render(
      <AttendeeAvatarStack attendees={attendees} totalCount={1} onPress={onPress} />
    );
    fireEvent.press(getByText('1 person going'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when totalCount is 0', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AttendeeAvatarStack attendees={[]} totalCount={0} onPress={onPress} />
    );
    fireEvent.press(getByText('Be the first to RSVP!'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows overflow badge when attendees exceed stack limit (5)', () => {
    const attendees = Array.from({ length: 5 }, (_, i) =>
      makeRsvp(String(i), `User ${i}`)
    );
    const { getByText } = render(
      <AttendeeAvatarStack attendees={attendees} totalCount={10} />
    );
    // totalCount(10) - visible(5) = +5 overflow
    expect(getByText('+5')).toBeTruthy();
  });

  it('does not show overflow badge when attendees equal totalCount', () => {
    const attendees = [makeRsvp('1', 'Alice'), makeRsvp('2', 'Bob')];
    const { queryByText } = render(
      <AttendeeAvatarStack attendees={attendees} totalCount={2} />
    );
    // No overflow
    expect(queryByText(/^\+/)).toBeNull();
  });

  it('renders avatars for each visible attendee', () => {
    const attendees = [makeRsvp('1', 'Alice'), makeRsvp('2', 'Bob')];
    const { getByTestId } = render(
      <AttendeeAvatarStack attendees={attendees} totalCount={2} />
    );
    expect(getByTestId('avatar-Alice')).toBeTruthy();
    expect(getByTestId('avatar-Bob')).toBeTruthy();
  });
});
