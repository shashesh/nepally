import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';
import type { EventRsvp } from '@nepally/shared';

vi.mock('@nepally/shared', () => ({
  formatPublicName: (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length < 2) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  },
}));

vi.mock('../Avatar', () => ({
  default: ({ name, toneKey, decorative }: { name: string; toneKey?: string; decorative?: boolean }) =>
    React.createElement('div', {
      'data-testid': `avatar-${name}`,
      'data-tone-key': toneKey,
      'data-decorative': decorative ? 'true' : undefined,
    }),
}));

import AttendeeList, { type AttendeeListProps } from './AttendeeList';

const makeRsvp = (id: string, name: string): EventRsvp => ({
  id,
  event_id: 'event-1',
  user_id: `user-${id}`,
  status: 'going',
  created_at: new Date().toISOString(),
  user: { id: `user-${id}`, full_name: name, trust_level: 1, profile_photo: null },
});

function renderList(props: Partial<AttendeeListProps> = {}) {
  const handlers = { onClose: vi.fn(), onRetry: vi.fn() };
  render(
    <AttendeeList opened attendees={[]} loading={false} error={null} {...handlers} {...props} />
  );
  return handlers;
}

describe('AttendeeList (web)', () => {
  it('titles the dialog "People going"', () => {
    renderList();
    expect(screen.getByRole('dialog', { name: 'People going' })).toBeDefined();
  });

  it('renders no dialog while closed', () => {
    renderList({ opened: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a loading status while the list loads', () => {
    renderList({ loading: true });
    expect(screen.getByRole('status').textContent).toContain('Loading attendees…');
    expect(screen.queryByText('No attendees yet.')).toBeNull();
  });

  it('shows the error with a Try again that retries', () => {
    const { onRetry } = renderList({ error: 'Failed to fetch attendees' });

    expect(screen.getByText("Couldn't load attendees")).toBeDefined();
    expect(screen.getByText('Failed to fetch attendees')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no attendees and not loading', () => {
    renderList();
    expect(screen.getByText('No attendees yet.')).toBeDefined();
  });

  it('renders attendee names', () => {
    renderList({ attendees: [makeRsvp('1', 'Asha Kumar'), makeRsvp('2', 'Rohan Shrestha')] });
    expect(screen.getByText('Asha K.')).toBeDefined();
    expect(screen.getByText('Rohan S.')).toBeDefined();
  });

  it('names each avatar with the public name, never the full one, keeping its tone', () => {
    renderList({ attendees: [makeRsvp('1', 'Asha Kumar')] });
    expect(screen.getByTestId('avatar-Asha K.').getAttribute('data-tone-key')).toBe('Asha Kumar');
    expect(screen.queryByTestId('avatar-Asha Kumar')).toBeNull();
  });

  it('keeps the avatar decorative, since the name is written beside it', () => {
    renderList({ attendees: [makeRsvp('1', 'Asha Kumar')] });
    expect(screen.getByTestId('avatar-Asha K.').getAttribute('data-decorative')).toBe('true');
  });

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "User" fallback when attendee has no user data', () => {
    renderList({ attendees: [{ ...makeRsvp('x', 'Nobody'), user: undefined }] });
    expect(screen.getByText('User')).toBeDefined();
  });
});
