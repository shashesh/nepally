import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMessages, getTotalUnreadCount, sendMessage, subscribeToMessages } from './messages';

describe('messages api', () => {
  function messagesQuery(result: { data: unknown; error: unknown }) {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue(result);
    const supabase = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    return { query, supabase };
  }

  it("asks for the conversation's newest messages", async () => {
    const { query, supabase } = messagesQuery({ data: [], error: null });

    await getMessages(supabase, 'c1', 25);

    expect(query.eq).toHaveBeenCalledWith('conversation_id', 'c1');
    expect(query.order).toHaveBeenCalledWith('timestamp', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(25);
  });

  it('returns the newest messages oldest first', async () => {
    const { supabase } = messagesQuery({
      data: [{ id: 'm3' }, { id: 'm2' }, { id: 'm1' }],
      error: null,
    });

    const result = await getMessages(supabase, 'c1', 3);

    expect(result.error).toBeUndefined();
    expect(result.data?.map((message) => message.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('returns the error when the query fails', async () => {
    const { supabase } = messagesQuery({ data: null, error: new Error('boom') });

    const result = await getMessages(supabase, 'c1');

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe('boom');
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

  it('subscribes on a fresh topic each time, so resubscribing never joins a channel still leaving', () => {
    const channel = { on: vi.fn(), subscribe: vi.fn() };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    const supabase = { channel: vi.fn().mockReturnValue(channel) } as unknown as SupabaseClient;

    subscribeToMessages(supabase, 'c1', vi.fn());
    subscribeToMessages(supabase, 'c1', vi.fn());

    const [first, second] = (supabase.channel as ReturnType<typeof vi.fn>).mock.calls.map(([topic]) => topic as string);
    expect(first.startsWith('messages:c1:')).toBe(true);
    expect(second.startsWith('messages:c1:')).toBe(true);
    expect(first).not.toBe(second);
  });
});
