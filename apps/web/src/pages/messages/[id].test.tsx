import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ConversationWithParticipant } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  replace: vi.fn(),
  useMessageThread: vi.fn(),
  reload: vi.fn(),
  send: vi.fn(),
  alert: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useMessageThread', () => ({ useMessageThread: mocks.useMessageThread }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
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

import MessageThreadPage from './[id].page';

const VIEWER = { id: 'viewer-1', full_name: 'Test User' };

const PARTNER: ConversationWithParticipant = {
  id: 'conv-1',
  last_message: null,
  last_message_time: null,
  created_at: '2026-09-20T10:00:00Z',
  other_user_id: 'partner-1',
  other_user_name: 'Bikal Shrestha',
  unread_count: 0,
};

const MESSAGE: ChatMessage = {
  id: 'm1',
  conversation_id: 'conv-1',
  sender_id: 'partner-1',
  text: 'Is the room still available?',
  type: 'text',
  read: false,
  read_at: null,
  timestamp: '2026-09-23T09:00:00Z',
};

function thread(overrides: Partial<ReturnType<typeof mocks.useMessageThread>> = {}) {
  return {
    messages: [],
    partner: null,
    loading: false,
    error: null,
    notFound: false,
    reload: mocks.reload,
    send: mocks.send,
    ...overrides,
  };
}

describe('MessageThreadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', mocks.alert);
    mocks.useAuth.mockReturnValue({ user: VIEWER });
    mocks.useRouter.mockReturnValue({ replace: mocks.replace, query: { id: 'conv-1' }, isReady: true });
    mocks.useMessageThread.mockReturnValue(thread({ partner: PARTNER, messages: [MESSAGE] }));
  });

  it('sends a signed-out visitor to log in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(<MessageThreadPage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it('asks for nothing until the router has the id', () => {
    mocks.useRouter.mockReturnValue({ replace: mocks.replace, query: {}, isReady: false });
    mocks.useMessageThread.mockReturnValue(thread());
    render(<MessageThreadPage />);

    expect(mocks.useMessageThread).toHaveBeenCalledWith(null, 'viewer-1');
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('Conversation not found')).toBeNull();
  });

  it('loads the conversation in the URL for the viewer', () => {
    render(<MessageThreadPage />);

    expect(mocks.useMessageThread).toHaveBeenCalledWith('conv-1', 'viewer-1');
  });

  it('shows a loading state under a heading', () => {
    mocks.useMessageThread.mockReturnValue(thread({ loading: true }));
    render(<MessageThreadPage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('Loading conversation…');
  });

  it('offers a retry when the conversation fails to load', () => {
    mocks.useMessageThread.mockReturnValue(thread({ error: "Couldn't load this conversation." }));
    render(<MessageThreadPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.reload).toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('says a conversation the viewer cannot see was not found, with no composer', () => {
    mocks.useMessageThread.mockReturnValue(thread({ notFound: true }));
    render(<MessageThreadPage />);

    expect(screen.getByText('Conversation not found')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Back to Messages' }).getAttribute('href')).toBe('/messages');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the thread under the partner’s public name, with the composer', () => {
    render(<MessageThreadPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Bikal S.' })).toBeDefined();
    expect(screen.getByRole('log', { name: 'Messages with Bikal S.' })).toBeDefined();
    expect(screen.getByText('Is the room still available?')).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Message Bikal S.' })).toBeDefined();
  });

  it('invites a first message in an empty thread', () => {
    mocks.useMessageThread.mockReturnValue(thread({ partner: PARTNER }));
    render(<MessageThreadPage />);

    expect(screen.getByText('No messages yet. Say hello!')).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Message Bikal S.' })).toBeDefined();
  });

  it("sends through the thread's send", async () => {
    mocks.send.mockResolvedValue(true);
    render(<MessageThreadPage />);

    const field = screen.getByRole('textbox', { name: 'Message Bikal S.' });
    fireEvent.change(field, { target: { value: 'Yes, it is' } });
    fireEvent.submit(field.closest('form')!);

    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('Yes, it is'));
  });

  it("opens the partner's profile from the avatar instead of an alert", async () => {
    render(<MessageThreadPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal S.' }));

    expect((await screen.findByRole('menuitem', { name: 'View profile' })).getAttribute('href')).toBe('/users/partner-1');
    expect(mocks.alert).not.toHaveBeenCalled();
  });
});
