import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationWithParticipant } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
  useConversations: vi.fn(),
  reload: vi.fn(),
  alert: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useConversations', () => ({ useConversations: mocks.useConversations }));
vi.mock('next/router', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import MessagesPage from './index.page';

const VIEWER = { id: 'user-1', full_name: 'Test User' };

function conversation(id: string, name: string, unread = 0): ConversationWithParticipant {
  return {
    id,
    last_message: `Last from ${name}`,
    last_message_time: null,
    created_at: '2026-09-20T10:00:00Z',
    other_user_id: `other-${id}`,
    other_user_name: name,
    unread_count: unread,
  };
}

function inbox(overrides: Partial<ReturnType<typeof mocks.useConversations>> = {}) {
  return { conversations: [], loading: false, error: null, reload: mocks.reload, ...overrides };
}

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', mocks.alert);
    mocks.useAuth.mockReturnValue({ user: VIEWER });
    mocks.useConversations.mockReturnValue(inbox());
  });

  it('sends a signed-out visitor to log in and renders nothing', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(<MessagesPage />);

    expect(screen.queryByRole('heading', { name: 'Messages' })).toBeNull();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it("loads the viewer's inbox under a Messages heading", () => {
    render(<MessagesPage />);

    expect(mocks.useConversations).toHaveBeenCalledWith('user-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Messages' })).toBeDefined();
  });

  it('shows a loading state', () => {
    mocks.useConversations.mockReturnValue(inbox({ loading: true }));
    render(<MessagesPage />);

    expect(screen.getByRole('status').textContent).toContain('Loading conversations…');
  });

  it('shows a failed load as an error with a retry, not as an empty inbox', () => {
    mocks.useConversations.mockReturnValue(inbox({ error: "Couldn't load your messages." }));
    render(<MessagesPage />);

    expect(screen.getByText("Couldn't load your messages.")).toBeDefined();
    expect(screen.queryByText('No messages yet')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.reload).toHaveBeenCalled();
  });

  it('says how to start a conversation when there are none', () => {
    render(<MessagesPage />);

    expect(screen.getByRole('heading', { name: 'No messages yet' })).toBeDefined();
    expect(screen.getByText(/member's profile, a post or a listing/)).toBeDefined();
  });

  it('lists each conversation as a row linking to its thread', () => {
    mocks.useConversations.mockReturnValue(
      inbox({ conversations: [conversation('conv-1', 'Bikal Shrestha'), conversation('conv-2', 'Ram Thapa', 3)] })
    );
    render(<MessagesPage />);

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Bikal S\./ }).getAttribute('href')).toBe('/messages/conv-1');
    expect(screen.getByRole('link', { name: /Ram T\..*3 unread/ }).getAttribute('href')).toBe('/messages/conv-2');
  });

  it("opens a member's profile from their avatar instead of an alert", async () => {
    mocks.useConversations.mockReturnValue(inbox({ conversations: [conversation('conv-1', 'Bikal Shrestha')] }));
    render(<MessagesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal S.' }));

    const profile = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(profile.getAttribute('href')).toBe('/users/other-conv-1');
    expect(mocks.alert).not.toHaveBeenCalled();
  });
});
