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
import { supabase } from '../lib/supabase';
import { announceNotificationsChanged } from '../lib/notificationsChanged';

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

  it('ignores realtime chat notifications, which the queries exclude', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const insert = mocks.subscriptions.find((sub) => sub.filter.table === 'notifications');
    act(() => insert?.callback({ new: { ...base, id: 'n-msg', type: 'message', title: 'Chat' } }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('keeps the item unread when marking read fails', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    mocks.markNotificationRead.mockResolvedValueOnce({ error: new Error('RLS blocked') });
    await act(() => result.current.markRead(base));
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.items[0].read).toBe(false);

    await act(() => result.current.markRead(base));
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items[0].read).toBe(true);
  });

  it('keeps the badge when marking everything read fails', async () => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    mocks.markAllNotificationsRead.mockResolvedValueOnce({ error: new Error('RLS blocked') });
    await act(() => result.current.markAllRead());
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.items[0].read).toBe(false);
  });

  it("drops a previous user's feed that arrives after switching users", async () => {
    let resolveFirstCount!: (value: { count: number }) => void;
    mocks.getUnreadNotificationCount
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstCount = resolve;
        })
      )
      .mockResolvedValue({ count: 3 });
    mocks.getNotifications
      .mockResolvedValueOnce({ data: [{ ...base, id: 'n-old', user_id: 'user-1' }] })
      .mockResolvedValue({ data: [{ ...base, id: 'n-new', user_id: 'user-2' }] });
    const { result, rerender } = renderHook(
      ({ userId }) => useNotificationsFeed({ userId, pollingEnabled: false }),
      { initialProps: { userId: 'user-1' } }
    );

    rerender({ userId: 'user-2' });
    await waitFor(() => expect(result.current.items[0]?.id).toBe('n-new'));
    await act(async () => {
      resolveFirstCount({ count: 9 });
    });
    expect(result.current.unreadCount).toBe(3);
    expect(result.current.items.map((item) => item.id)).toEqual(['n-new']);
  });

  // Leaving /notifications turns polling back on and resubscribes at once;
  // a reused topic would join the channel that is still leaving.
  it('subscribes on a fresh topic each time polling turns back on', () => {
    const { rerender } = renderHook(({ pollingEnabled }) => useNotificationsFeed({ userId: 'user-1', pollingEnabled }), {
      initialProps: { pollingEnabled: true },
    });
    rerender({ pollingEnabled: false });
    rerender({ pollingEnabled: true });

    const topics = vi
      .mocked(supabase.channel)
      .mock.calls.map(([topic]) => topic as string)
      .filter((topic) => topic.startsWith('notifications:user-1:'));
    expect(topics).toHaveLength(2);
    expect(new Set(topics).size).toBe(2);
  });

  it('does not subscribe to realtime when the notifications page owns it', async () => {
    renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: false }));
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1));
    expect(mocks.subscriptions).toHaveLength(0);
  });

  it('does not poll on tab focus when polling is disabled', async () => {
    renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: false }));
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
  });

  // /notifications turns the bell's polling and realtime off; INSERTs that
  // landed meanwhile only reach the bell through a reload (recon 23).
  it('reloads when polling turns back on', async () => {
    const { rerender } = renderHook(({ pollingEnabled }) => useNotificationsFeed({ userId: 'user-1', pollingEnabled }), {
      initialProps: { pollingEnabled: false },
    });
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1));
    rerender({ pollingEnabled: true });
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(2));
  });

  it.each([true, false])('reloads when /notifications announces a change (polling %s)', async (pollingEnabled) => {
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled }));
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    mocks.getUnreadNotificationCount.mockResolvedValue({ count: 0 });
    act(() => announceNotificationsChanged());
    await waitFor(() => expect(result.current.unreadCount).toBe(0));
    expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(2);
  });

  it('stops listening for announcements on unmount', async () => {
    const { unmount } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: true }));
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1));
    unmount();
    act(() => announceNotificationsChanged());
    expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
  });

  it('applies only the latest of two overlapping loads', async () => {
    let resolveFirst!: (value: { count: number }) => void;
    let resolveSecond!: (value: { count: number }) => void;
    mocks.getUnreadNotificationCount
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    const { result } = renderHook(() => useNotificationsFeed({ userId: 'user-1', pollingEnabled: false }));
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(1));

    act(() => announceNotificationsChanged());
    await waitFor(() => expect(mocks.getUnreadNotificationCount).toHaveBeenCalledTimes(2));
    await act(async () => {
      resolveSecond({ count: 4 });
    });
    await act(async () => {
      resolveFirst({ count: 9 });
    });
    expect(result.current.unreadCount).toBe(4);
  });
});
