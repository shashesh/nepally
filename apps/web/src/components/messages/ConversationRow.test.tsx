import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationWithParticipant } from '@nepally/shared';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import { ConversationRow } from './ConversationRow';

function conversation(overrides: Partial<ConversationWithParticipant> = {}): ConversationWithParticipant {
  return {
    id: 'conv-1',
    last_message: 'Is the room still available?',
    last_message_time: '2026-09-23T09:00:00Z',
    created_at: '2026-09-20T10:00:00Z',
    other_user_id: 'user-9',
    other_user_name: 'Bikal Shrestha',
    other_user_photo: null,
    other_user_trust_level: 1,
    unread_count: 0,
    ...overrides,
  };
}

function renderRow(overrides: Partial<ConversationWithParticipant> = {}) {
  return render(
    <ul>
      <ConversationRow conversation={conversation(overrides)} />
    </ul>
  );
}

describe('ConversationRow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-23T11:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('links to the thread under the public name, never the full name', () => {
    renderRow();

    const link = screen.getByRole('link', { name: /Bikal S\./ });
    expect(link.getAttribute('href')).toBe('/messages/conv-1');
    expect(screen.queryByText('Bikal Shrestha')).toBeNull();
  });

  it('shows when the last message was sent and what it said', () => {
    renderRow();

    const link = screen.getByRole('link', { name: /Bikal S\./ });
    expect(link.textContent).toContain('2h ago');
    expect(link.textContent).toContain('Is the room still available?');
  });

  it('says so when there are no messages yet', () => {
    renderRow({ last_message: null, last_message_time: null });

    expect(screen.getByRole('link', { name: /No messages yet/ })).toBeDefined();
  });

  it('puts the unread count into the link name', () => {
    renderRow({ unread_count: 3 });

    expect(screen.getByRole('link', { name: /3 unread/ })).toBeDefined();
  });

  it('shows no count when everything is read', () => {
    renderRow();

    expect(screen.queryByText(/unread/)).toBeNull();
  });

  it("offers the partner's profile from the avatar, and no Chat item", async () => {
    vi.useRealTimers();
    renderRow();

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal S.' }));

    const profile = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(profile.getAttribute('href')).toBe('/users/user-9');
    expect(screen.queryByRole('menuitem', { name: 'Chat' })).toBeNull();
  });
});
