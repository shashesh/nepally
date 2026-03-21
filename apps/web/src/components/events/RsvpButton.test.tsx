import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';

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
    expect(container.querySelector('button')).toBeNull();
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

  it('is disabled when past', () => {
    render(React.createElement(RsvpButton, { state: 'past' }));
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled') || btn.getAttribute('data-disabled') === 'true').toBe(true);
  });

  it('is disabled when organizer', () => {
    render(React.createElement(RsvpButton, { state: 'organizer' }));
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled') || btn.getAttribute('data-disabled') === 'true').toBe(true);
  });

  it('is disabled when level0', () => {
    render(React.createElement(RsvpButton, { state: 'level0' }));
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled') || btn.getAttribute('data-disabled') === 'true').toBe(true);
  });

  it('shows "Updating..." when loading', () => {
    render(React.createElement(RsvpButton, { state: 'default', loading: true }));
    expect(screen.getByText('Updating...')).toBeDefined();
  });

  it('is disabled when loading', () => {
    render(React.createElement(RsvpButton, { state: 'default', loading: true }));
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled') || btn.getAttribute('data-disabled') === 'true').toBe(true);
  });
});
