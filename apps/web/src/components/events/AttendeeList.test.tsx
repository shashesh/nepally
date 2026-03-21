import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';
import type { EventRsvp } from '@nusa/shared';

vi.mock('@nusa/shared', () => ({
  formatPublicName: (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length < 2) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  },
}));

vi.mock('../Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': `avatar-${name}` }),
}));

import AttendeeList from './AttendeeList';

const makeRsvp = (id: string, name: string) => ({
  id,
  event_id: 'event-1',
  user_id: `user-${id}`,
  created_at: new Date().toISOString(),
  user: { id: `user-${id}`, full_name: name, trust_level: 1, profile_photo: null },
});

describe('AttendeeList (web)', () => {
  it('renders title "Attendees"', () => {
    render(React.createElement(AttendeeList, { attendees: [], onClose: vi.fn() }));
    expect(screen.getByText('Attendees')).toBeDefined();
  });

  it('shows empty state when no attendees and not loading', () => {
    render(React.createElement(AttendeeList, { attendees: [], onClose: vi.fn() }));
    expect(screen.getByText('No attendees yet.')).toBeDefined();
  });

  it('renders attendee names', () => {
    const attendees = [makeRsvp('1', 'Asha Kumar'), makeRsvp('2', 'Rohan Shrestha')];
    render(React.createElement(AttendeeList, { attendees, onClose: vi.fn() }));
    expect(screen.getByText('Asha K.')).toBeDefined();
    expect(screen.getByText('Rohan S.')).toBeDefined();
  });

  it('renders an avatar for each attendee', () => {
    const attendees = [makeRsvp('1', 'Asha Kumar')];
    render(React.createElement(AttendeeList, { attendees, onClose: vi.fn() }));
    expect(screen.getByTestId('avatar-Asha Kumar')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(React.createElement(AttendeeList, { attendees: [], onClose }));
    // Mantine Modal renders a close button with role="button"
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find(b => b.className.includes('close') || b.className.includes('Close'));
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "User" fallback when attendee has no user data', () => {
    const rsvpNoUser = {
      id: 'rsvp-x',
      event_id: 'event-1',
      user_id: 'user-x',
      created_at: new Date().toISOString(),
      user: undefined,
    };
    render(React.createElement(AttendeeList, { attendees: [rsvpNoUser] as EventRsvp[], onClose: vi.fn() }));
    expect(screen.getByText('User')).toBeDefined();
  });
});
