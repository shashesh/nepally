import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMessages, getTotalUnreadCount, sendMessage } from './messages';

describe('messages api', () => {
  it('fetches messages for a conversation', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({
      data: [{ id: 'm1', conversation_id: 'c1', text: 'Hello' }],
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getMessages(supabase, 'c1', 25);

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(query.order).toHaveBeenCalledWith('timestamp', { ascending: true });
  });

  it('sums unread counts across participants', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      gt: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gt.mockResolvedValue({
      data: [{ unread_count: 2 }, { unread_count: 5 }, { unread_count: null }],
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getTotalUnreadCount(supabase, 'user-1');

    expect(result.error).toBeUndefined();
    expect(result.count).toBe(7);
  });

  it('sends message and updates conversation metadata', async () => {
    const messagesQuery = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    messagesQuery.insert.mockReturnValue(messagesQuery);
    messagesQuery.select.mockReturnValue(messagesQuery);
    messagesQuery.single.mockResolvedValue({
      data: {
        id: 'm1',
        conversation_id: 'c1',
        sender_id: 'u1',
        text: 'Hello there',
        type: 'text',
        read: false,
        read_at: null,
        timestamp: new Date().toISOString(),
      },
      error: null,
    });

    const conversationsQuery = {
      update: vi.fn(),
      eq: vi.fn(),
    };
    conversationsQuery.update.mockReturnValue(conversationsQuery);
    conversationsQuery.eq.mockResolvedValue({ error: null });

    const fromMock = vi.fn((table: string) => {
      if (table === 'messages') return messagesQuery;
      if (table === 'conversations') return conversationsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const supabase = { from: fromMock } as unknown as SupabaseClient;

    const result = await sendMessage(supabase, 'c1', 'u1', 'Hello there');

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe('m1');
    expect(messagesQuery.insert).toHaveBeenCalled();
    expect(conversationsQuery.update).toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalledWith('conversation_participants');
  });
});
