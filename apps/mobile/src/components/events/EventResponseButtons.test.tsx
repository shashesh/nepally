import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EventResponseButtons } from './EventResponseButtons';

describe('EventResponseButtons', () => {
  it('shows Interested and Going as buttons, neither selected without a response', () => {
    const { getByRole } = render(<EventResponseButtons value={null} onChange={jest.fn()} />);

    const interested = getByRole('button', { name: 'Interested' });
    const going = getByRole('button', { name: 'Going' });
    expect(interested.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    expect(going.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
  });

  it('marks the member’s response as selected', () => {
    const { getByRole } = render(<EventResponseButtons value="interested" onChange={jest.fn()} />);

    expect(getByRole('button', { name: 'Interested' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true })
    );
    expect(getByRole('button', { name: 'Going' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false })
    );
  });

  it('passes the pressed option', () => {
    const onChange = jest.fn();
    const { getByRole } = render(<EventResponseButtons value="interested" onChange={onChange} />);

    fireEvent.press(getByRole('button', { name: 'Going' }));

    expect(onChange).toHaveBeenCalledWith('going');
  });

  it('clears the response when the selected option is pressed again', () => {
    const onChange = jest.fn();
    const { getByRole } = render(<EventResponseButtons value="going" onChange={onChange} />);

    fireEvent.press(getByRole('button', { name: 'Going' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('is disabled while a change is saving', () => {
    const onChange = jest.fn();
    const { getByRole } = render(<EventResponseButtons value="going" busy onChange={onChange} />);

    const going = getByRole('button', { name: 'Going' });
    fireEvent.press(going);
    fireEvent.press(getByRole('button', { name: 'Interested' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(going.props.accessibilityState).toEqual({ selected: true, disabled: true });
  });

  it('shows an unverified member "Verify to RSVP", which does nothing', () => {
    const onChange = jest.fn();
    const { getByText, queryByRole } = render(
      <EventResponseButtons value={null} blockedBy="unverified" onChange={onChange} />
    );

    fireEvent.press(getByText('Verify to RSVP'));

    expect(onChange).not.toHaveBeenCalled();
    expect(queryByRole('button', { name: 'Going' })).toBeNull();
  });

  it('says a past event has passed', () => {
    const { getByText } = render(
      <EventResponseButtons value="going" blockedBy="past" onChange={jest.fn()} />
    );
    expect(getByText('Event Has Passed')).toBeTruthy();
  });

  it("tells the organizer they're the organizer", () => {
    const { getByText } = render(
      <EventResponseButtons value={null} blockedBy="organizer" onChange={jest.fn()} />
    );
    expect(getByText("You're the Organizer")).toBeTruthy();
  });

  it('renders nothing for a cancelled event', () => {
    const { toJSON } = render(
      <EventResponseButtons value={null} blockedBy="cancelled" onChange={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });
});
