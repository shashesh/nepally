import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
  subscriptions: [] as Array<{ filter: { table?: string; event?: string }; callback: (payload: unknown) => void }>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockImplementation(() => {
      const channel = {
        on: vi.fn((_type: unknown, filter: { table?: string; event?: string }, callback: (payload: unknown) => void) => {
          mocks.subscriptions.push({ filter, callback });
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getNotifications: mocks.getNotifications,
  getUnreadNotificationCount: mocks.getUnreadNotificationCount,
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
  deleteNotification: mocks.deleteNotification,
}));

import { useNotificationsFeed } from './useNotificationsFeed';

const base: Notification = {
  id: 'n-1',
  user_id: 'user-1',
  type: 'system',
  title: 'Hello',
  body: 'Body',
  data: {},
  read: false,
  sent_at: '2026-09-14T11:00:00Z',
  created_at: '2026-09-14T11:00:00Z',
  read_at: null,
} as Notification;

describe('useNotificationsFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscriptions.length = 0;
    mocks.getUnreadNotificationCount.mockResolvedValue({ count: 1 });
    mocks.getNotifications.mockResolvedValue({ data: [base] });
    mocks.markNotificationRead.mockResolvedValue({});
    mocks.markAllNotificationsRead.mockResolvedValue({});
    mocks.deleteNotification.mockResolvedValue({});
  });

  it('loads the unread count and the 8 most recent items', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.unreadCount).toBe(1);
    expect(mocks.getNotifications).toHaveBeenCalledWith(expect.anything(), 'user-1', 8, 0);
  });

  it('prepends realtime notifications and bumps the count', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const insert = mocks.subscriptions.find((sub) => sub.filter.table === 'notifications');
    act(() => insert?.callback({ new: { ...base, id: 'n-2', title: 'New' } }));
    expect(result.current.items[0].id).toBe('n-2');
    expect(result.current.unreadCount).toBe(2);
  });

  it('marks one notification read', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(() => result.current.markRead(base));
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(expect.anything(), 'n-1');
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items[0].read).toBe(true);
  });

  it('marks everything read', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(() => result.current.markAllRead());
    expect(result.current.unreadCount).toBe(0);
  });

  it('removes a notification, keeping it when the delete fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    mocks.deleteNotification.mockResolvedValueOnce({ error: new Error('RLS blocked') });
    let removed = true;
    await act(async () => {
      removed = await result.current.remove(base);
    });
    expect(removed).toBe(false);
    expect(result.current.items).toHaveLength(1);

    await act(async () => {
      removed = await result.current.remove(base);
    });
    expect(removed).toBe(true);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
    errorSpy.mockRestore();
  });

  it('does not poll on tab focus when polling is disabled', async () => {
    renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: false }));
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
  });
});
