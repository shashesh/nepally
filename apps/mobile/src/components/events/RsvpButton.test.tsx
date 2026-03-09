import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RsvpButton } from './RsvpButton';

describe('RsvpButton (mobile)', () => {
  it('renders RSVP label in default state', () => {
    const { getByText } = render(<RsvpButton state="default" />);
    expect(getByText('RSVP')).toBeTruthy();
  });

  it('renders "Going ✓" label when going', () => {
    const { getByText } = render(<RsvpButton state="going" />);
    expect(getByText('Going ✓')).toBeTruthy();
  });

  it('renders "Event Has Passed" when past', () => {
    const { getByText } = render(<RsvpButton state="past" />);
    expect(getByText('Event Has Passed')).toBeTruthy();
  });

  it("renders \"You're the Organizer\" when organizer", () => {
    const { getByText } = render(<RsvpButton state="organizer" />);
    expect(getByText("You're the Organizer")).toBeTruthy();
  });

  it('renders "Verify to RSVP" for level0 state', () => {
    const { getByText } = render(<RsvpButton state="level0" />);
    expect(getByText('Verify to RSVP')).toBeTruthy();
  });

  it('returns null for cancelled state', () => {
    const { toJSON } = render(<RsvpButton state="cancelled" />);
    expect(toJSON()).toBeNull();
  });

  it('calls onPress when default state button pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<RsvpButton state="default" onPress={onPress} />);
    fireEvent.press(getByText('RSVP'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when going state button pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<RsvpButton state="going" onPress={onPress} />);
    fireEvent.press(getByText('Going ✓'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when past (disabled)', () => {
    const onPress = jest.fn();
    const { getByText } = render(<RsvpButton state="past" onPress={onPress} />);
    fireEvent.press(getByText('Event Has Passed'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when organizer (disabled)', () => {
    const onPress = jest.fn();
    const { getByText } = render(<RsvpButton state="organizer" onPress={onPress} />);
    fireEvent.press(getByText("You're the Organizer"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when level0 (disabled)', () => {
    const onPress = jest.fn();
    const { getByText } = render(<RsvpButton state="level0" onPress={onPress} />);
    fireEvent.press(getByText('Verify to RSVP'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows "Updating..." when loading', () => {
    const { getByText } = render(<RsvpButton state="default" loading />);
    expect(getByText('Updating...')).toBeTruthy();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(<RsvpButton state="default" loading onPress={onPress} />);
    fireEvent.press(getByText('Updating...'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
