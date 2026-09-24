import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTotalUnreadCount: vi.fn(),
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
  getTotalUnreadCount: mocks.getTotalUnreadCount,
}));

import { useUnreadMessageCount } from './useUnreadMessageCount';
import { supabase } from '../lib/supabase';
import { announceMessagesRead } from '../lib/unreadMessages';

function messageInsert() {
  return mocks.subscriptions.find((sub) => sub.filter.table === 'messages' && sub.filter.event === 'INSERT');
}

describe('useUnreadMessageCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscriptions.length = 0;
    mocks.getTotalUnreadCount.mockResolvedValue({ count: 2 });
  });

  it('loads the unread count', async () => {
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(2));
  });

  it('refreshes when someone else sends a message', async () => {
    mocks.getTotalUnreadCount.mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 4 });
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(1));
    act(() => messageInsert()?.callback({ new: { sender_id: 'user-2' } }));
    await waitFor(() => expect(result.current).toBe(4));
  });

  it("ignores the viewer's own messages", async () => {
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(2));
    const calls = mocks.getTotalUnreadCount.mock.calls.length;
    act(() => messageInsert()?.callback({ new: { sender_id: 'user-1' } }));
    expect(mocks.getTotalUnreadCount.mock.calls.length).toBe(calls);
  });

  it('refreshes when the tab becomes visible', async () => {
    mocks.getTotalUnreadCount.mockResolvedValueOnce({ count: 0 }).mockResolvedValue({ count: 6 });
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(mocks.getTotalUnreadCount).toHaveBeenCalled());
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(result.current).toBe(6));
  });

  it("drops a previous user's count that arrives after switching users", async () => {
    let resolveFirst!: (value: { count: number }) => void;
    mocks.getTotalUnreadCount
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
      )
      .mockResolvedValue({ count: 5 });
    const { result, rerender } = renderHook(({ userId }) => useUnreadMessageCount(userId), {
      initialProps: { userId: 'user-1' },
    });

    rerender({ userId: 'user-2' });
    await waitFor(() => expect(result.current).toBe(5));
    await act(async () => {
      resolveFirst({ count: 9 });
    });
    expect(result.current).toBe(5);
  });

  it('keeps the newest count when two refreshes land out of order', async () => {
    let resolveOlder!: (value: { count: number }) => void;
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(2));

    // A message arrives (refresh 1, slow), then the thread marks it read
    // (refresh 2, fast). The slow, older answer must not win.
    mocks.getTotalUnreadCount
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOlder = resolve;
        })
      )
      .mockResolvedValueOnce({ count: 0 });
    act(() => messageInsert()?.callback({ new: { sender_id: 'user-2' } }));
    act(() => announceMessagesRead());
    await waitFor(() => expect(result.current).toBe(0));

    await act(async () => {
      resolveOlder({ count: 3 });
    });
    expect(result.current).toBe(0);
  });

  it('refreshes at once when a thread says it marked messages read', async () => {
    mocks.getTotalUnreadCount.mockResolvedValueOnce({ count: 4 }).mockResolvedValue({ count: 0 });
    const { result } = renderHook(() => useUnreadMessageCount('user-1'));
    await waitFor(() => expect(result.current).toBe(4));

    act(() => announceMessagesRead());

    await waitFor(() => expect(result.current).toBe(0));
  });

  it('subscribes on fresh topics, so a remount never reuses a channel still leaving', () => {
    const { unmount } = renderHook(() => useUnreadMessageCount('user-1'));
    unmount();
    renderHook(() => useUnreadMessageCount('user-1'));

    const topics = vi.mocked(supabase.channel).mock.calls.map(([topic]) => topic as string);
    const unread = topics.filter((topic) => topic.startsWith('chat-unread:user-1:'));
    expect(unread).toHaveLength(2);
    expect(new Set(unread).size).toBe(2);
  });

  it('returns 0 and does nothing without a user', () => {
    const { result } = renderHook(() => useUnreadMessageCount(null));
    expect(result.current).toBe(0);
    expect(mocks.getTotalUnreadCount).not.toHaveBeenCalled();
  });
});
