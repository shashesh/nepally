import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const threadMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getConversationsMock: vi.fn(),
  getMessagesMock: vi.fn(),
  sendMessageMock: vi.fn(),
  markAsReadMock: vi.fn(),
  subscribeToMessagesMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
  removeChannelMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: threadMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: threadMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({
  supabase: { removeChannel: threadMocks.removeChannelMock },
}));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getConversations: threadMocks.getConversationsMock,
    getMessages: threadMocks.getMessagesMock,
    sendMessage: threadMocks.sendMessageMock,
    markAsRead: threadMocks.markAsReadMock,
    subscribeToMessages: threadMocks.subscribeToMessagesMock,
    formatRelativeTime: threadMocks.formatRelativeTimeMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) =>
    React.createElement('a', { href, className }, children),
}));

import MessageThreadPage from './[id]';

const mockChannel = { id: 'channel-1' };

describe('MessageThreadPage', () => {
  const mockReplace = vi.fn();
  const mockUser = { id: 'user-1', full_name: 'Test User' };

  beforeEach(() => {
    vi.clearAllMocks();
    threadMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      query: { id: 'conv-123' },
    });
    threadMocks.subscribeToMessagesMock.mockReturnValue(mockChannel);
    threadMocks.getConversationsMock.mockResolvedValue({ data: [] });
    threadMocks.markAsReadMock.mockResolvedValue({});
    threadMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
  });

  it('returns null and redirects when user is not logged in', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: null });
    const { container } = render(<MessageThreadPage />);
    expect(container.firstChild).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('shows loading state while fetching messages', () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockReturnValue(new Promise(() => {}));
    render(<MessageThreadPage />);
    expect(screen.getByText('Loading messages...')).toBeDefined();
  });

  it('shows empty state when there are no messages', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({ data: [] });
    render(<MessageThreadPage />);
    await waitFor(() => {
      expect(screen.getByText('No messages yet. Say hello!')).toBeDefined();
    });
  });

  it('shows error state when messages fail to load', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({ data: null });
    render(<MessageThreadPage />);
    await waitFor(() => {
      expect(screen.getByText('Could not load messages. Please try again.')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });
  });

  it('renders messages when loaded', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          sender_id: 'user-1',
          text: 'Hello there!',
          timestamp: '2026-02-24T10:00:00Z',
          read: true,
        },
        {
          id: 'msg-2',
          sender_id: 'user-2',
          text: 'Hi back!',
          timestamp: '2026-02-24T10:01:00Z',
          read: false,
        },
      ],
    });
    render(<MessageThreadPage />);
    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeDefined();
      expect(screen.getByText('Hi back!')).toBeDefined();
    });
  });

  it('shows read receipt for sent messages', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({
      data: [
        { id: 'msg-1', sender_id: 'user-1', text: 'Sent msg', timestamp: '2026-02-24T10:00:00Z', read: true },
      ],
    });
    render(<MessageThreadPage />);
    await waitFor(() => {
      expect(screen.getByText('✓✓')).toBeDefined();
    });
  });

  it('sends a message when the form is submitted', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({ data: [] });
    threadMocks.sendMessageMock.mockResolvedValue({
      data: { id: 'msg-new', sender_id: 'user-1', text: 'New message', timestamp: '2026-02-24T11:00:00Z', read: false },
    });
    render(<MessageThreadPage />);
    await waitFor(() => expect(screen.getByText('No messages yet. Say hello!')).toBeDefined());
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(threadMocks.sendMessageMock).toHaveBeenCalledWith(
        expect.anything(),
        'conv-123',
        'user-1',
        'New message'
      );
    });
  });

  it('disables send button when input is empty', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({ data: [] });
    render(<MessageThreadPage />);
    await waitFor(() => expect(screen.queryByText('Loading messages...')).toBeNull());
    const sendBtn = screen.getByRole('button', { name: '↑' });
    expect(sendBtn.hasAttribute('disabled')).toBe(true);
  });

  it('renders back link to /messages', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({ data: [] });
    render(<MessageThreadPage />);
    await waitFor(() => expect(screen.getByText('← Back')).toBeDefined());
    expect(screen.getByText('← Back').closest('a')?.getAttribute('href')).toBe('/messages');
  });

  it('groups messages by date separator', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    const today = new Date().toISOString();
    threadMocks.getMessagesMock.mockResolvedValue({
      data: [
        { id: 'msg-1', sender_id: 'user-1', text: 'Today msg', timestamp: today, read: false },
      ],
    });
    render(<MessageThreadPage />);
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeDefined();
    });
  });

  it('shows View Profile only in avatar menu within message thread', async () => {
    threadMocks.useAuthMock.mockReturnValue({ user: mockUser });
    threadMocks.getMessagesMock.mockResolvedValue({ data: [] });
    const mockConversations = [
      {
        id: 'conv-123',
        last_message: 'Hi',
        last_message_time: '2026-02-24T10:00:00Z',
        created_at: '2026-02-24T09:00:00Z',
        other_user_id: 'user-2',
        other_user_name: 'Other User',
        other_user_photo: null,
        other_user_trust_level: 1,
        unread_count: 0,
      },
    ];

    threadMocks.getConversationsMock.mockResolvedValue({ data: mockConversations });

    render(<MessageThreadPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('User options')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('User options'));

    await waitFor(() => {
      expect(screen.getByText('👤 View Profile')).toBeDefined();
    });
    expect(screen.queryByText(/^Chat$/)).toBeNull();
  });
});
