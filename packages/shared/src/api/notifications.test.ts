import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from './notifications';

/** Build a chainable Supabase query mock that resolves at the last method called. */
function makeQuery(resolvedValue: unknown) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'eq', 'neq', 'order', 'range', 'update', 'delete'];
  methods.forEach((m) => {
    q[m] = vi.fn().mockReturnValue(q);
  });
  // The last method in the chain resolves the promise
  q['range'].mockResolvedValue(resolvedValue);
  q['update'].mockResolvedValue(resolvedValue);
  q['delete'].mockResolvedValue(resolvedValue);
  return q;
}

describe('getNotifications', () => {
  it('returns notifications ordered by sent_at DESC', async () => {
    const rows = [
      { id: 'n1', user_id: 'u1', type: 'post_response', title: 'Bob', body: 'Hello', data: {}, read: false, read_at: null, sent_at: '2026-03-01T00:00:00Z' },
    ];
    const q = makeQuery({ data: rows, error: null });
    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getNotifications(supabase, 'u1');

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].id).toBe('n1');
    expect(q.neq).toHaveBeenCalledWith('type', 'message');
    expect(q.order).toHaveBeenCalledWith('sent_at', { ascending: false });
  });

  it('returns error when supabase fails', async () => {
    const q = makeQuery({ data: null, error: { message: 'DB error' } });
    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getNotifications(supabase, 'u1');

    expect(result).toEqual({ error: expect.any(Error) });
  });

  it('reports hasMore when a full page comes back', async () => {
    const rows = [{ id: 'n1' }, { id: 'n2' }];
    const q = makeQuery({ data: rows, error: null });
    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getNotifications(supabase, 'u1', 2, 0);

    expect(result.hasMore).toBe(true);
  });

  it('reports no more after a short page', async () => {
    const q = makeQuery({ data: [{ id: 'n1' }], error: null });
    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getNotifications(supabase, 'u1', 2, 0);

    expect(result.hasMore).toBe(false);
  });

  it('uses correct offset for pagination', async () => {
    const q = makeQuery({ data: [], error: null });
    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    await getNotifications(supabase, 'u1', 10, 20);

    expect(q.range).toHaveBeenCalledWith(20, 29);
  });
});

describe('getUnreadNotificationCount', () => {
  it('returns unread count', async () => {
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
    };
    q.select.mockReturnValue(q);
    q.neq.mockReturnValue(q);
    // First eq (user_id), second eq (read=false) resolves
    q.eq.mockReturnValueOnce(q).mockResolvedValueOnce({ count: 5, error: null });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getUnreadNotificationCount(supabase, 'u1');

    expect(result.count).toBe(5);
    expect(result.error).toBeUndefined();
    expect(q.neq).toHaveBeenCalledWith('type', 'message');
  });

  it('returns count 0 on error', async () => {
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
    };
    q.select.mockReturnValue(q);
    q.neq.mockReturnValue(q);
    q.eq.mockReturnValueOnce(q).mockResolvedValueOnce({ count: null, error: { message: 'fail' } });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await getUnreadNotificationCount(supabase, 'u1');

    expect(result.count).toBe(0);
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('markNotificationRead', () => {
  it('updates read and read_at fields', async () => {
    const q = {
      update: vi.fn(),
      eq: vi.fn(),
    };
    q.update.mockReturnValue(q);
    q.eq.mockResolvedValue({ error: null });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await markNotificationRead(supabase, 'notif-1');

    expect(result.error).toBeUndefined();
    expect(q.update).toHaveBeenCalledWith(
      expect.objectContaining({ read: true, read_at: expect.any(String) })
    );
  });
});

describe('markAllNotificationsRead', () => {
  it('updates all unread notifications for user', async () => {
    const q = {
      update: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
    };
    q.update.mockReturnValue(q);
    q.neq.mockReturnValue(q);
    q.eq.mockReturnValueOnce(q).mockResolvedValueOnce({ error: null });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await markAllNotificationsRead(supabase, 'u1');

    expect(result.error).toBeUndefined();
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(q.neq).toHaveBeenCalledWith('type', 'message');
    expect(q.eq).toHaveBeenCalledWith('read', false);
  });
});

describe('deleteNotification', () => {
  it('deletes the notification by id', async () => {
    const q = {
      delete: vi.fn(),
      eq: vi.fn(),
    };
    q.delete.mockReturnValue(q);
    q.eq.mockResolvedValue({ error: null });

    const supabase = { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient;

    const result = await deleteNotification(supabase, 'notif-1');

    expect(result.error).toBeUndefined();
    expect(q.eq).toHaveBeenCalledWith('id', 'notif-1');
  });
});
