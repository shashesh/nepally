import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getNotificationsMock: vi.fn(),
  getUnreadNotificationCountMock: vi.fn(),
  markNotificationReadMock: vi.fn(),
  markAllNotificationsReadMock: vi.fn(),
  deleteNotificationMock: vi.fn(),
  realtimeSubscriptions: [] as Array<{
    event: unknown;
    filter: unknown;
    callback: (payload: unknown) => void;
  }>,
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouterMock }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockImplementation(() => {
      const channelRef: {
        on: ReturnType<typeof vi.fn>;
        subscribe: ReturnType<typeof vi.fn>;
      } = {
        on: vi.fn(),
        subscribe: vi.fn(),
      };

      channelRef.on.mockImplementation((_event: unknown, _filter: unknown, callback: (payload: unknown) => void) => {
        mocks.realtimeSubscriptions.push({
          event: _event,
          filter: _filter,
          callback,
        });
        return channelRef;
      });

      channelRef.subscribe.mockReturnValue(channelRef);
      return channelRef;
    }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
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

const messageNotif = {
  ...sampleNotif,
  id: 'n-message',
  type: 'message' as const,
  title: 'New message',
  data: { conversation_id: 'conv-1', sender_id: 'user-2' },
};

const eventNotif = {
  ...sampleNotif,
  id: 'n-event',
  type: 'system' as const,
  title: 'Event reminder',
  data: { event_id: 'event-1' },
};

const malformedNotif = {
  ...sampleNotif,
  id: 'n-malformed',
  type: 'message' as const,
  title: 'Malformed payload',
  data: { conversation_id: 123 },
};

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtimeSubscriptions.length = 0;
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

  it('navigates to message thread for message notification payload', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [messageNotif] });

    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('New message')).toBeDefined());
    fireEvent.click(screen.getByText('New message').closest('li')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/messages/conv-1');
    });
  });

  it('navigates to event detail for event notification payload', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [eventNotif] });

    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('Event reminder')).toBeDefined());
    fireEvent.click(screen.getByText('Event reminder').closest('li')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/events/event-1');
    });
  });

  it('falls back safely to notifications page for malformed payloads', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [malformedNotif] });

    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('Malformed payload')).toBeDefined());
    fireEvent.click(screen.getByText('Malformed payload').closest('li')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/notifications');
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

  it('reloads notifications when Try again is clicked after a failure', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValueOnce({ error: new Error('DB error') });
    mocks.getNotificationsMock.mockResolvedValueOnce({ data: [sampleNotif] });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('Try again')).toBeDefined());

    fireEvent.click(screen.getByText('Try again'));

    await waitFor(() => expect(screen.getByText('New comment on your post')).toBeDefined());
    expect(screen.queryByText('Could not load notifications. Please try again.')).toBeNull();
    expect(mocks.getNotificationsMock).toHaveBeenCalledTimes(2);
    expect(mocks.getNotificationsMock).toHaveBeenLastCalledWith(expect.anything(), 'u1', 20, 0);
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

  it('keeps notification visible when delete fails', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [sampleNotif] });
    mocks.deleteNotificationMock.mockResolvedValue({ error: new Error('RLS delete blocked') });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('New comment on your post')).toBeDefined());

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(mocks.deleteNotificationMock).toHaveBeenCalledWith(expect.anything(), 'n1');
    });
    expect(screen.getByText('New comment on your post')).toBeDefined();

    errorSpy.mockRestore();
  });

  it('adds message notifications from realtime inserts', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [] });

    render(<NotificationsPage />);

    await waitFor(() => expect(mocks.getNotificationsMock).toHaveBeenCalled());

    const notificationInsertSubscription = mocks.realtimeSubscriptions.find((sub) => {
      const filter = sub.filter as { table?: string; event?: string };
      return filter?.table === 'notifications' && filter?.event === 'INSERT';
    });

    expect(notificationInsertSubscription).toBeDefined();

    notificationInsertSubscription?.callback({
      new: {
        ...messageNotif,
        title: 'Realtime message',
      },
    });

    await waitFor(() => expect(screen.getByText('Realtime message')).toBeDefined());
  });

  it('does not reload notifications when tab becomes visible again (handled by Layout polling)', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getNotificationsMock.mockResolvedValue({ data: [] });

    render(<NotificationsPage />);

    await waitFor(() => expect(mocks.getNotificationsMock).toHaveBeenCalledTimes(1));

    fireEvent(document, new Event('visibilitychange'));

    // The notifications page no longer registers its own visibility handler —
    // this is intentionally handled by the Layout's polling to avoid double-polling.
    await waitFor(() => {
      expect(mocks.getNotificationsMock).toHaveBeenCalledTimes(1);
    });
  });
});
