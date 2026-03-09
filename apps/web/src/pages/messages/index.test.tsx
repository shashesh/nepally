import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const messagesMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getConversationsMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: messagesMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: messagesMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getConversations: messagesMocks.getConversationsMock,
    formatRelativeTime: messagesMocks.formatRelativeTimeMock,
  };
});
vi.mock('../../components/Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

import MessagesPage from './index';

describe('MessagesPage', () => {
  const mockReplace = vi.fn();
  const mockUser = { id: 'user-1', full_name: 'Test User' };

  beforeEach(() => {
    vi.clearAllMocks();
    messagesMocks.useRouterMock.mockReturnValue({ replace: mockReplace });
    messagesMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
  });

  it('returns null and redirects when user is not logged in', async () => {
    messagesMocks.useAuthMock.mockReturnValue({ user: null });
    const { container } = render(<MessagesPage />);
    expect(container.firstChild).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('shows loading state while fetching conversations', () => {
    messagesMocks.useAuthMock.mockReturnValue({ user: mockUser });
    messagesMocks.getConversationsMock.mockReturnValue(new Promise(() => {}));
    render(<MessagesPage />);
    expect(screen.getByText('Loading conversations...')).toBeDefined();
  });

  it('shows empty state when there are no conversations', async () => {
    messagesMocks.useAuthMock.mockReturnValue({ user: mockUser });
    messagesMocks.getConversationsMock.mockResolvedValue({ data: [] });
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeDefined();
    });
  });

  it('renders a list of conversations', async () => {
    messagesMocks.useAuthMock.mockReturnValue({ user: mockUser });
    messagesMocks.getConversationsMock.mockResolvedValue({
      data: [
        {
          id: 'conv-1',
          other_user_name: 'Bikal Shrestha',
          other_user_photo: null,
          other_user_trust_level: 1,
          last_message: 'Hello there!',
          last_message_time: '2026-02-24T10:00:00Z',
          unread_count: 0,
        },
        {
          id: 'conv-2',
          other_user_name: 'Ram Thapa',
          other_user_photo: null,
          other_user_trust_level: 0,
          last_message: 'How are you?',
          last_message_time: '2026-02-24T09:00:00Z',
          unread_count: 3,
        },
      ],
    });
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Bikal Shrestha').length).toBeGreaterThan(0);
      expect(screen.getByText('Hello there!')).toBeDefined();
      expect(screen.getAllByText('Ram Thapa').length).toBeGreaterThan(0);
      expect(screen.getByText('How are you?')).toBeDefined();
    });
  });

  it('shows unread badge on conversations with unread messages', async () => {
    messagesMocks.useAuthMock.mockReturnValue({ user: mockUser });
    messagesMocks.getConversationsMock.mockResolvedValue({
      data: [
        {
          id: 'conv-1',
          other_user_name: 'Ram',
          other_user_photo: null,
          other_user_trust_level: 0,
          last_message: 'Hi',
          last_message_time: null,
          unread_count: 5,
        },
      ],
    });
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });
  });

  it('links each conversation to /messages/[id]', async () => {
    messagesMocks.useAuthMock.mockReturnValue({ user: mockUser });
    messagesMocks.getConversationsMock.mockResolvedValue({
      data: [
        {
          id: 'conv-abc',
          other_user_name: 'Someone',
          other_user_photo: null,
          other_user_trust_level: 0,
          last_message: 'Hey',
          last_message_time: null,
          unread_count: 0,
        },
      ],
    });
    render(<MessagesPage />);
    await waitFor(() => {
      const link = screen.getByText('Hey').closest('a');
      expect(link?.getAttribute('href')).toBe('/messages/conv-abc');
    });
  });
});
