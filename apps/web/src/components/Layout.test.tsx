import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const layoutMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getTotalUnreadCountMock: vi.fn(),
  getUnreadNotificationCountMock: vi.fn(),
  getNotificationsMock: vi.fn(),
  markAllNotificationsReadMock: vi.fn(),
  markNotificationReadMock: vi.fn(),
  signOutMock: vi.fn(),
  realtimeSubscriptions: [] as Array<{
    event: unknown;
    filter: unknown;
    callback: (payload: unknown) => void;
  }>,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: layoutMocks.useAuthMock,
}));

vi.mock('next/router', () => ({
  useRouter: layoutMocks.useRouterMock,
}));

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
        layoutMocks.realtimeSubscriptions.push({
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

vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getTotalUnreadCount: layoutMocks.getTotalUnreadCountMock,
    getUnreadNotificationCount: layoutMocks.getUnreadNotificationCountMock,
    getNotifications: layoutMocks.getNotificationsMock,
    markAllNotificationsRead: layoutMocks.markAllNotificationsReadMock,
    markNotificationRead: layoutMocks.markNotificationReadMock,
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children, className, 'aria-label': ariaLabel, onClick }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'aria-label'?: string;
    onClick?: () => void;
  }) => React.createElement('a', { href, className, 'aria-label': ariaLabel, onClick }, children),
}));

vi.mock('./LocationSwitcher', () => ({
  default: () => React.createElement('div', { 'data-testid': 'location-switcher' }),
}));

vi.mock('./Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));

import Layout from './Layout';

describe('Layout', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    layoutMocks.realtimeSubscriptions.length = 0;
    layoutMocks.useRouterMock.mockReturnValue({
      pathname: '/',
      push: mockPush,
      replace: mockReplace,
    });
    layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 0 });
    layoutMocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 0 });
    layoutMocks.getNotificationsMock.mockResolvedValue({ data: [] });
    layoutMocks.markAllNotificationsReadMock.mockResolvedValue({});
    layoutMocks.markNotificationReadMock.mockResolvedValue({});
  });

  describe('when loading', () => {
    it('renders a loading spinner and no navigation', () => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: null,
        loading: true,
        signOut: layoutMocks.signOutMock,
      });
      render(<Layout>Content</Layout>);
      expect(screen.queryByText('Log In')).toBeNull();
      expect(screen.queryByText('Content')).toBeNull();
    });
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: null,
        loading: false,
        signOut: layoutMocks.signOutMock,
      });
    });

    it('renders Log In and Sign Up links', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Log In')).toBeDefined();
      expect(screen.getByText('Sign Up')).toBeDefined();
    });

    it('renders NUSA logo', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('NUSA')).toBeDefined();
    });

    it('renders children', () => {
      render(<Layout><div>Page content</div></Layout>);
      expect(screen.getByText('Page content')).toBeDefined();
    });

    it('does not render sidebar nav or LocationSwitcher', () => {
      render(<Layout>Content</Layout>);
      expect(screen.queryByText('Home')).toBeNull();
      expect(screen.queryByTestId('location-switcher')).toBeNull();
    });
  });

  describe('when user is logged in', () => {
    const mockUser = {
      id: 'user-1',
      full_name: 'Test User',
      email: 'test@example.com',
      trust_level: 1,
      profile_photo: null,
    };

    beforeEach(() => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: layoutMocks.signOutMock,
      });
    });

    it('renders sidebar nav links (Home, Events, Marketplace)', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('Events')).toBeDefined();
      expect(screen.getByText('Marketplace')).toBeDefined();
    });

    it('shows Post button when trust_level >= 1', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Post')).toBeDefined();
    });

    it('shows Verify to Post when trust_level is 0', () => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: { ...mockUser, trust_level: 0 },
        loading: false,
        signOut: layoutMocks.signOutMock,
      });
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Verify to Post')).toBeDefined();
    });

    it('renders LocationSwitcher in the header', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByTestId('location-switcher')).toBeDefined();
    });

    it('renders children in the main area', () => {
      render(<Layout><span>Main content</span></Layout>);
      expect(screen.getByText('Main content')).toBeDefined();
    });

    it('shows chat unread badge when unread count > 0', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 5 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(screen.getByText('5')).toBeDefined();
      });
    });

    it('shows 99+ on messages badge when unread count exceeds 99', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 100 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeDefined();
      });
    });

    it('updates messages badge when realtime unread event arrives', async () => {
      layoutMocks.getTotalUnreadCountMock
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValue({ count: 4 });

      render(<Layout>Content</Layout>);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeDefined();
      });

      const messageInsertSubscription = layoutMocks.realtimeSubscriptions.find((sub) => {
        const filter = sub.filter as { table?: string; event?: string };
        return filter?.table === 'messages' && filter?.event === 'INSERT';
      });

      expect(messageInsertSubscription).toBeDefined();

      messageInsertSubscription?.callback({ new: { sender_id: 'other-user-id' } });

      await waitFor(() => {
        expect(screen.getByText('4')).toBeDefined();
      });
    });

    it('does not refresh unread count for own message insert event', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 2 });

      render(<Layout>Content</Layout>);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeDefined();
      });

      const callsBefore = layoutMocks.getTotalUnreadCountMock.mock.calls.length;

      const messageInsertSubscription = layoutMocks.realtimeSubscriptions.find((sub) => {
        const filter = sub.filter as { table?: string; event?: string };
        return filter?.table === 'messages' && filter?.event === 'INSERT';
      });

      expect(messageInsertSubscription).toBeDefined();
      messageInsertSubscription?.callback({ new: { sender_id: mockUser.id } });

      expect(layoutMocks.getTotalUnreadCountMock.mock.calls.length).toBe(callsBefore);
    });

    it('refreshes unread count on visibilitychange when page becomes active', async () => {
      layoutMocks.getTotalUnreadCountMock
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 6 });

      render(<Layout>Content</Layout>);

      await waitFor(() => {
        expect(layoutMocks.getTotalUnreadCountMock).toHaveBeenCalled();
      });

      fireEvent(document, new Event('visibilitychange'));

      await waitFor(() => {
        expect(screen.getByText('6')).toBeDefined();
      });
    });

    it('does not show messages badge when count is 0', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 0 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(layoutMocks.getTotalUnreadCountMock).toHaveBeenCalled();
      });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('shows notification bell badge when unread notification count > 0', async () => {
      layoutMocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 3 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(screen.getByText('3')).toBeDefined();
      });
    });

    it('shows 9+ on notification badge when count exceeds 9', async () => {
      layoutMocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 12 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(screen.getByText('9+')).toBeDefined();
      });
    });

    it('opens notification dropdown when bell is clicked', async () => {
      render(<Layout>Content</Layout>);
      await waitFor(() => expect(layoutMocks.getNotificationsMock).toHaveBeenCalled());
      fireEvent.click(screen.getByLabelText(/Notifications/i));
      expect(screen.getByText('Notifications')).toBeDefined();
      expect(screen.getByText('See all notifications →')).toBeDefined();
    });

    it('shows empty state in dropdown when no notifications', async () => {
      layoutMocks.getNotificationsMock.mockResolvedValue({ data: [] });
      render(<Layout>Content</Layout>);
      await waitFor(() => expect(layoutMocks.getNotificationsMock).toHaveBeenCalled());
      fireEvent.click(screen.getByLabelText(/Notifications/i));
      expect(screen.getByText('No notifications yet')).toBeDefined();
    });

    it('shows Mark all as read button when there are unread notifications', async () => {
      layoutMocks.getUnreadNotificationCountMock.mockResolvedValue({ count: 2 });
      layoutMocks.getNotificationsMock.mockResolvedValue({ data: [] });
      render(<Layout>Content</Layout>);
      await waitFor(() => expect(layoutMocks.getUnreadNotificationCountMock).toHaveBeenCalled());
      fireEvent.click(screen.getByLabelText(/Notifications/i));
      expect(screen.getByText('Mark all as read')).toBeDefined();
    });

    it('opens account dropdown when avatar button is clicked', async () => {
      render(<Layout>Content</Layout>);
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Open account menu'));
      });
      await waitFor(() => {
        expect(screen.getByText('View Profile')).toBeDefined();
        expect(screen.getByText('Manage Locations')).toBeDefined();
        expect(screen.getByText('Sign Out')).toBeDefined();
      });
    });

    it('closes account dropdown when avatar button is clicked again', async () => {
      render(<Layout>Content</Layout>);
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Open account menu'));
      });
      await waitFor(() => {
        expect(screen.getByText('View Profile')).toBeDefined();
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Open account menu'));
      });
      await waitFor(() => {
        expect(screen.queryByText('View Profile')).toBeNull();
      });
    });

    it('calls signOut and navigates to / when Sign Out is clicked', async () => {
      layoutMocks.signOutMock.mockResolvedValue(undefined);
      render(<Layout>Content</Layout>);
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Open account menu'));
      });
      await waitFor(() => {
        expect(screen.getByText('Sign Out')).toBeDefined();
      });
      await act(async () => {
        fireEvent.click(screen.getByText('Sign Out'));
      });
      await waitFor(() => {
        expect(layoutMocks.signOutMock).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });
});
