import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationWithParticipant } from '@nepally/shared';

const mocks = vi.hoisted(() => ({ getConversations: vi.fn() }));

vi.mock('../lib/supabase', () => ({ supabase: { tag: 'client' } }));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getConversations: mocks.getConversations,
}));

import { useConversations } from './useConversations';

function conversation(id: string): ConversationWithParticipant {
  return {
    id,
    last_message: 'Hello',
    last_message_time: '2026-09-23T10:00:00Z',
    created_at: '2026-09-20T10:00:00Z',
    other_user_id: `other-${id}`,
    other_user_name: 'Bikal Shrestha',
    unread_count: 0,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConversations.mockResolvedValue({ data: [conversation('c1'), conversation('c2')] });
  });

  it("loads the member's conversations", async () => {
    const { result } = renderHook(() => useConversations('user-1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.getConversations).toHaveBeenCalledWith({ tag: 'client' }, 'user-1');
    expect(result.current.conversations.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.current.error).toBeNull();
  });

  it('reports a failed load instead of an empty inbox', async () => {
    mocks.getConversations.mockResolvedValue({ error: new Error('permission denied for table conversations') });
    const { result } = renderHook(() => useConversations('user-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Couldn't load your messages.");
    expect(result.current.conversations).toEqual([]);
  });

  it('reload clears the error and asks again', async () => {
    mocks.getConversations.mockResolvedValueOnce({ error: new Error('boom') });
    const { result } = renderHook(() => useConversations('user-1'));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.getConversations).toHaveBeenCalledTimes(2);
    expect(result.current.conversations).toHaveLength(2);
  });

  it('makes no request without a user', () => {
    const { result } = renderHook(() => useConversations(null));

    expect(result.current.loading).toBe(false);
    expect(mocks.getConversations).not.toHaveBeenCalled();
  });

  it("drops the previous user's response after the user changes", async () => {
    const first = deferred<{ data: ConversationWithParticipant[] }>();
    mocks.getConversations.mockReturnValueOnce(first.promise);
    const { result, rerender } = renderHook(({ userId }) => useConversations(userId), {
      initialProps: { userId: 'user-1' },
    });

    mocks.getConversations.mockResolvedValueOnce({ data: [conversation('c9')] });
    rerender({ userId: 'user-2' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      first.resolve({ data: [conversation('c1')] });
    });

    expect(result.current.conversations.map((c) => c.id)).toEqual(['c9']);
  });
});
