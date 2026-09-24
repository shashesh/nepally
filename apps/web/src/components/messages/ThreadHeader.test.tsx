import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { ConversationWithParticipant } from '@nepally/shared';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import { ThreadHeader } from './ThreadHeader';

const PARTNER: ConversationWithParticipant = {
  id: 'conv-1',
  last_message: null,
  last_message_time: null,
  created_at: '2026-09-20T10:00:00Z',
  other_user_id: 'partner-1',
  other_user_name: 'Bikal Shrestha',
  unread_count: 0,
};

describe('ThreadHeader', () => {
  it("heads the page with the partner's public name", () => {
    render(<ThreadHeader partner={PARTNER} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Bikal S.' })).toBeDefined();
    expect(screen.queryByText('Bikal Shrestha')).toBeNull();
  });

  it('links back to the inbox', () => {
    render(<ThreadHeader partner={PARTNER} />);

    expect(screen.getByRole('link', { name: 'Messages' }).getAttribute('href')).toBe('/messages');
  });

  it("offers the partner's profile from the avatar", async () => {
    render(<ThreadHeader partner={PARTNER} />);

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal S.' }));

    const profile = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(profile.getAttribute('href')).toBe('/users/partner-1');
    expect(screen.queryByRole('menuitem', { name: 'Chat' })).toBeNull();
  });
});
