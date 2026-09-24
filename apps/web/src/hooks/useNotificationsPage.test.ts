import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
  announce: vi.fn(),
  /** Every channel call and query, in order, to check subscribe-before-load. */
  calls: [] as string[],
  inserts: [] as Array<(payload: unknown) => void>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn((topic: string) => {
      const channel = {
        topic,
        on: vi.fn((_type: unknown, _filter: unknown, callback: (payload: unknown) => void) => {
          mocks.inserts.push(callback);
          return channel;
        }),
        subscribe: vi.fn(() => {
          mocks.calls.push('subscribe');
          return channel;
        }),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getNotifications: (...args: unknown[]) => {
    mocks.calls.push('getNotifications');
    return mocks.getNotifications(...args);
  },
  getUnreadNotificationCount: (...args: unknown[]) => {
    mocks.calls.push('getUnreadNotificationCount');
    return mocks.getUnreadNotificationCount(...args);
  },
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
  deleteNotification: mocks.deleteNotification,
}));

vi.mock('../lib/notificationsChanged', () => ({ announceNotificationsChanged: mocks.announce }));

import { supabase } from '../lib/supabase';
import { NOTIFICATIONS_PAGE_SIZE, useNotificationsPage } from './useNotificationsPage';

function notification(id: string, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    user_id: 'user-1',
    type: 'post_response',
    title: id,
    body: '',
    data: {},
    read: false,
    read_at: null,
    sent_at: '2026-09-24T10:00:00.000Z',
    ...overrides,
  };
}

function ids(count: number, prefix = 'n'): Notification[] {
  return Array.from({ length: count }, (_, index) => notification(`${prefix}${index}`));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** The INSERT callback of the most recent channel. */
function insert(row: Notification) {
  act(() => mocks.inserts[mocks.inserts.length - 1]({ new: row }));
}

async function loaded(userId: string | null = 'user-1') {
  const hook = renderHook(({ id }) => useNotificationsPage(id), { initialProps: { id: userId } });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useNotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
    mocks.inserts.length = 0;
    mocks.getNotifications.mockResolvedValue({ data: [notification('a'), notification('b', { read: true })], hasMore: false });
    mocks.getUnreadNotificationCount.mockResolvedValue({ count: 1 });
    mocks.markNotificationRead.mockResolvedValue({});
    mocks.markAllNotificationsRead.mockResolvedValue({});
    mocks.deleteNotification.mockResolvedValue({});
  });

  it('subscribes, then loads the first page and the unread count', async () => {
    const { result } = await loaded();

    expect(mocks.calls.slice(0, 3)).toEqual(['subscribe', 'getNotifications', 'getUnreadNotificationCount']);
    expect(mocks.getNotifications).toHaveBeenCalledWith(supabase, 'user-1', NOTIFICATIONS_PAGE_SIZE, 0);
    expect(result.current.notifications.map((n) => n.id)).toEqual(['a', 'b']);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(supabase.channel).mock.calls[0][0]).toMatch(/^notifications-page:user-1:/);
  });

  it.each([
    ['the list', () => mocks.getNotifications.mockResolvedValueOnce({ error: new Error('down') })],
    ['the count', () => mocks.getUnreadNotificationCount.mockResolvedValueOnce({ count: 0, error: new Error('down') })],
  ])('reports a failed load of %s with an empty list, and reloads', async (_what, fail) => {
    fail();
    const { result } = await loaded();

    expect(result.current.error).toBe("Couldn't load your notifications.");
    expect(result.current.notifications).toEqual([]);
    expect(result.current.hasMore).toBe(false);

    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.notifications.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('pages from the rows on screen and skips rows it already has', async () => {
    mocks.getNotifications.mockResolvedValueOnce({ data: ids(20), hasMore: true });
    const { result } = await loaded();
    expect(result.current.hasMore).toBe(true);

    mocks.getNotifications.mockResolvedValueOnce({ data: [notification('n19'), notification('x')], hasMore: false });
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadingMore).toBe(false));
    expect(mocks.getNotifications).toHaveBeenLastCalledWith(supabase, 'user-1', NOTIFICATIONS_PAGE_SIZE, 20);
    expect(result.current.notifications).toHaveLength(21);
    expect(result.current.notifications[20].id).toBe('x');
    expect(result.current.hasMore).toBe(false);
  });

  it('keeps the rows when a page fails, and retries it', async () => {
    mocks.getNotifications.mockResolvedValueOnce({ data: ids(20), hasMore: true });
    const { result } = await loaded();

    mocks.getNotifications.mockResolvedValueOnce({ error: new Error('down') });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadMoreError).toBe("Couldn't load more notifications."));
    expect(result.current.notifications).toHaveLength(20);
    expect(result.current.hasMore).toBe(false);

    mocks.getNotifications.mockResolvedValueOnce({ data: [notification('x')], hasMore: false });
    act(() => result.current.retryLoadMore());
    await waitFor(() => expect(result.current.notifications).toHaveLength(21));
    expect(result.current.loadMoreError).toBeNull();
  });

  it('counts a realtime row in the next page’s offset', async () => {
    mocks.getNotifications.mockResolvedValueOnce({ data: ids(20), hasMore: true });
    const { result } = await loaded();

    insert(notification('new'));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadingMore).toBe(false));
    expect(mocks.getNotifications).toHaveBeenLastCalledWith(supabase, 'user-1', NOTIFICATIONS_PAGE_SIZE, 21);
  });

  it('prepends an unread realtime row and counts it', async () => {
    const { result } = await loaded();

    insert(notification('new'));

    expect(result.current.notifications[0].id).toBe('new');
    expect(result.current.unreadCount).toBe(2);
  });

  it('ignores realtime chat notifications and duplicates', async () => {
    const { result } = await loaded();

    insert(notification('chat', { type: 'message' }));
    insert(notification('a'));

    expect(result.current.notifications.map((n) => n.id)).toEqual(['a', 'b']);
    expect(result.current.unreadCount).toBe(1);
  });

  it('counts a redelivered realtime row once, even before a render', async () => {
    const { result } = await loaded();

    act(() => {
      const callback = mocks.inserts[mocks.inserts.length - 1];
      callback({ new: notification('new') });
      callback({ new: notification('new') });
    });

    expect(result.current.notifications.map((n) => n.id)).toEqual(['new', 'a', 'b']);
    expect(result.current.unreadCount).toBe(2);
  });

  it('keeps a row delivered during the first load without counting it', async () => {
    const list = deferred<{ data: Notification[]; hasMore: boolean }>();
    mocks.getNotifications.mockReturnValueOnce(list.promise);
    const { result } = renderHook(() => useNotificationsPage('user-1'));

    insert(notification('early', { sent_at: '2026-09-24T11:00:00.000Z' }));
    await act(async () => {
      list.resolve({ data: [notification('a')], hasMore: false });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications.map((n) => n.id)).toEqual(['early', 'a']);
    expect(result.current.unreadCount).toBe(1);
  });

  it('marks one read and tells the bell', async () => {
    const { result } = await loaded();

    let ok = false;
    await act(async () => {
      ok = await result.current.markRead(result.current.notifications[0]);
    });

    expect(ok).toBe(true);
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(supabase, 'a');
    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(mocks.announce).toHaveBeenCalledTimes(1);
  });

  it('leaves the row unread when marking it read fails', async () => {
    mocks.markNotificationRead.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    let ok = true;
    await act(async () => {
      ok = await result.current.markRead(result.current.notifications[0]);
    });

    expect(ok).toBe(false);
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(1);
    expect(mocks.announce).not.toHaveBeenCalled();
  });

  it('marks a row read once when asked twice at once', async () => {
    const { result } = await loaded();
    const row = result.current.notifications[0];

    let results: boolean[] = [];
    await act(async () => {
      results = await Promise.all([result.current.markRead(row), result.current.markRead(row)]);
    });

    expect(results).toEqual([true, true]);
    expect(mocks.markNotificationRead).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(0);
  });

  it('makes no call for a row that is already read', async () => {
    const { result } = await loaded();

    let ok = false;
    await act(async () => {
      ok = await result.current.markRead(result.current.notifications[1]);
    });

    expect(ok).toBe(true);
    expect(mocks.markNotificationRead).not.toHaveBeenCalled();
  });

  it('marks everything read and tells the bell', async () => {
    const { result } = await loaded();

    let ok = false;
    await act(async () => {
      ok = await result.current.markAllRead();
    });

    expect(ok).toBe(true);
    expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith(supabase, 'user-1');
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(mocks.announce).toHaveBeenCalledTimes(1);
  });

  it('keeps everything as it was when marking all read fails', async () => {
    mocks.markAllNotificationsRead.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    let ok = true;
    await act(async () => {
      ok = await result.current.markAllRead();
    });

    expect(ok).toBe(false);
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });

  it('drops a deleted row, lowering the count only for an unread one', async () => {
    const { result } = await loaded();

    await act(async () => {
      await result.current.remove(result.current.notifications[1]);
    });
    expect(result.current.notifications.map((n) => n.id)).toEqual(['a']);
    expect(result.current.unreadCount).toBe(1);

    await act(async () => {
      await result.current.remove(result.current.notifications[0]);
    });
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(mocks.announce).toHaveBeenCalledTimes(2);
  });

  it('deletes a row once when asked twice at once', async () => {
    mocks.getUnreadNotificationCount.mockResolvedValue({ count: 2 });
    const { result } = await loaded();
    const row = result.current.notifications[0];

    let results: boolean[] = [];
    await act(async () => {
      results = await Promise.all([result.current.remove(row), result.current.remove(row)]);
    });

    expect(results).toEqual([true, true]);
    expect(mocks.deleteNotification).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('keeps the row when a delete fails', async () => {
    mocks.deleteNotification.mockResolvedValueOnce({ error: new Error('down') });
    const { result } = await loaded();

    let ok = true;
    await act(async () => {
      ok = await result.current.remove(result.current.notifications[0]);
    });

    expect(ok).toBe(false);
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it('waits for a page in flight before deleting, and holds paging meanwhile', async () => {
    mocks.getNotifications.mockResolvedValueOnce({ data: ids(20), hasMore: true });
    const { result } = await loaded();
    const nextPage = deferred<{ data: Notification[]; hasMore: boolean }>();
    mocks.getNotifications.mockReturnValueOnce(nextPage.promise);

    act(() => result.current.loadMore());
    let removal!: Promise<boolean>;
    act(() => {
      removal = result.current.remove(result.current.notifications[0]);
    });

    expect(result.current.hasMore).toBe(false);
    expect(mocks.deleteNotification).not.toHaveBeenCalled();

    await act(async () => {
      nextPage.resolve({ data: [notification('x')], hasMore: true });
      await removal;
    });

    expect(mocks.deleteNotification).toHaveBeenCalledWith(supabase, 'n0');
    expect(result.current.notifications).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);
  });

  it('starts over for a different member, leaving the old channel and dropping late answers', async () => {
    const late = deferred<{ data: Notification[]; hasMore: boolean }>();
    mocks.getNotifications.mockReturnValueOnce(late.promise);
    const { result, rerender } = renderHook(({ id }) => useNotificationsPage(id), { initialProps: { id: 'user-1' } });

    mocks.getNotifications.mockResolvedValueOnce({ data: [notification('mine')], hasMore: false });
    rerender({ id: 'user-2' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      late.resolve({ data: [notification('theirs')], hasMore: false });
    });
    expect(result.current.notifications.map((n) => n.id)).toEqual(['mine']);
  });

  it('loads nothing without a member', () => {
    const { result } = renderHook(() => useNotificationsPage(null));

    expect(result.current.loading).toBe(false);
    expect(mocks.getNotifications).not.toHaveBeenCalled();
    expect(supabase.channel).not.toHaveBeenCalled();
  });
});
