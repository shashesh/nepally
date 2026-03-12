import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getNotificationsMock: vi.fn(),
  getUnreadNotificationCountMock: vi.fn(),
  markNotificationReadMock: vi.fn(),
  markAllNotificationsReadMock: vi.fn(),
  deleteNotificationMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouterMock }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getNotifications: mocks.getNotificationsMock,
    getUnreadNotificationCount: mocks.getUnreadNotificationCountMock,
    markNotificationRead: mocks.markNotificationReadMock,
    markAllNotificationsRead: mocks.markAllNotificationsReadMock,
    deleteNotification: mocks.deleteNotificationMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

import NotificationsPage from './notifications.page';

const mockReplace = vi.fn();
const mockPush = vi.fn();

const mockUser = {
  id: 'u1',
  full_name: 'Test User',
  email: 'test@nusa.app',
  trust_level: 1,
  metro_area_id: 'dallas-tx',
};

const sampleNotif = {
  id: 'n1',
  user_id: 'u1',
  type: 'post_response' as const,
  title: 'New comment on your post',
  body: 'Someone replied to your listing.',
  data: { post_id: 'post-1' },
  read: false,
  read_at: null,
  sent_at: new Date().toISOString(),
};

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      pathname: '/notifications',
    });
    mocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 0 });
    mocks.getNotificationsMock.mockResolvedValue({ data: [] });
    mocks.markNotificationReadMock.mockResolvedValue({});
    mocks.markAllNotificationsReadMock.mockResolvedValue({});
    mocks.deleteNotificationMock.mockResolvedValue({});
  });

  it('redirects to /login when user is not logged in', async () => {
    mocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(<NotificationsPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('redirects to /onboarding/zip when user has no metro', async () => {
    mocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, metro_area_id: undefined },
      loading: false,
    });
    render(<NotificationsPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding/zip'));
  });

  it('shows empty state when there are no notifications', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [] });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('All caught up!')).toBeDefined());
  });

  it('renders notifications grouped by day', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [sampleNotif] });
    mocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 1 });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('New comment on your post')).toBeDefined());
    expect(screen.getByText('Today')).toBeDefined();
  });

  it('shows unread badge count in header', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [sampleNotif] });
    mocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 1 });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('1')).toBeDefined());
  });

  it('marks notification as read and navigates to post on click', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [sampleNotif] });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('New comment on your post')).toBeDefined());
    fireEvent.click(screen.getByText('New comment on your post').closest('li')!);
    await waitFor(() => {
      expect(mocks.markNotificationReadMock).toHaveBeenCalledWith(expect.anything(), 'n1');
      expect(mockPush).toHaveBeenCalledWith('/posts/post-1');
    });
  });

  it('calls markAllNotificationsRead when Mark all as read is clicked', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [sampleNotif] });
    mocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 1 });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('Mark all as read')).toBeDefined());
    fireEvent.click(screen.getByText('Mark all as read'));
    await waitFor(() => expect(mocks.markAllNotificationsReadMock).toHaveBeenCalledWith(expect.anything(), 'u1'));
  });

  it('shows error state when getNotifications fails', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ error: new Error('DB error') });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('Could not load notifications. Please try again.')).toBeDefined());
  });

  it('renders emergency notifications in their own group', async () => {
    const emergencyNotif = {
      ...sampleNotif,
      id: 'n2',
      type: 'emergency_alert' as const,
      title: 'Gas leak reported',
      body: 'Near Finney Ave, Dallas TX',
    };
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [emergencyNotif, sampleNotif] });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('🛡️ Emergency Alerts')).toBeDefined());
  });
});
