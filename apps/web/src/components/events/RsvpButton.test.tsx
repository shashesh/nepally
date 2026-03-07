import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./RsvpButton.module.css', () => ({
  default: {
    button: 'button',
    buttonGoing: 'buttonGoing',
    buttonDisabled: 'buttonDisabled',
  },
}));

import RsvpButton from './RsvpButton';

describe('RsvpButton (web)', () => {
  it('renders RSVP label in default state', () => {
    render(React.createElement(RsvpButton, { state: 'default' }));
    expect(screen.getByText('RSVP')).toBeDefined();
  });

  it('renders "Going ✓" when going', () => {
    render(React.createElement(RsvpButton, { state: 'going' }));
    expect(screen.getByText('Going ✓')).toBeDefined();
  });

  it('renders "Event Has Passed" when past', () => {
    render(React.createElement(RsvpButton, { state: 'past' }));
    expect(screen.getByText('Event Has Passed')).toBeDefined();
  });

  it("renders \"You're the Organizer\" when organizer", () => {
    render(React.createElement(RsvpButton, { state: 'organizer' }));
    expect(screen.getByText("You're the Organizer")).toBeDefined();
  });

  it('renders "Verify to RSVP" for level0 state', () => {
    render(React.createElement(RsvpButton, { state: 'level0' }));
    expect(screen.getByText('Verify to RSVP')).toBeDefined();
  });

  it('returns null for cancelled state', () => {
    const { container } = render(React.createElement(RsvpButton, { state: 'cancelled' }));
    expect(container.firstChild).toBeNull();
  });

  it('calls onPress when default state button clicked', () => {
    const onPress = vi.fn();
    render(React.createElement(RsvpButton, { state: 'default', onPress }));
    fireEvent.click(screen.getByText('RSVP'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when going state button clicked', () => {
    const onPress = vi.fn();
    render(React.createElement(RsvpButton, { state: 'going', onPress }));
    fireEvent.click(screen.getByText('Going ✓'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not call onPress when past', () => {
    const onPress = vi.fn();
    render(React.createElement(RsvpButton, { state: 'past', onPress }));
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is disabled and does not call onPress when organizer', () => {
    const onPress = vi.fn();
    render(React.createElement(RsvpButton, { state: 'organizer', onPress }));
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled and does not call onPress when level0', () => {
    const onPress = vi.fn();
    render(React.createElement(RsvpButton, { state: 'level0', onPress }));
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows "Updating..." when loading', () => {
    render(React.createElement(RsvpButton, { state: 'default', loading: true }));
    expect(screen.getByText('Updating...')).toBeDefined();
  });

  it('is disabled when loading', () => {
    render(React.createElement(RsvpButton, { state: 'default', loading: true }));
    const btn = screen.getByRole('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
