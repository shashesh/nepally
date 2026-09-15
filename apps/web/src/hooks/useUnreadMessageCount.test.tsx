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

  it('returns 0 and does nothing without a user', () => {
    const { result } = renderHook(() => useUnreadMessageCount(null));
    expect(result.current).toBe(0);
    expect(mocks.getTotalUnreadCount).not.toHaveBeenCalled();
  });
});
