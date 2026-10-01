import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UNAVAILABLE_ACCOUNT_NAME } from '../constants/accountDeletion';
import { getConversations } from './conversations';

type Result = { data: unknown; error: unknown };

/** A query builder whose methods all chain, and which resolves to `result` when awaited. */
function query(result: Result) {
  const builder: Record<string, unknown> = {
    then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  for (const method of ['select', 'eq', 'in', 'neq', 'order', 'or']) {
    builder[method] = vi.fn(() => builder);
  }
  return builder;
}

/** Answers from() in call order: my rows, conversations, partner rows, blocks, then partner profiles. */
function client(...results: Result[]): SupabaseClient {
  const queue = results.map(query);
  return { from: vi.fn(() => queue.shift()) } as unknown as SupabaseClient;
}

const ok = (data: unknown): Result => ({ data, error: null });
const MINE = ok([{ conversation_id: 'c1', unread_count: 2 }]);
const CONVERSATION = ok([
  {
    id: 'c1',
    last_message: 'Hi',
    last_message_time: '2026-09-30T10:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
  },
]);
const PARTNER_ROW = ok([{ conversation_id: 'c1', user_id: 'u2', name: 'Bikal Shrestha' }]);
const NO_BLOCKS = ok([]);

describe('getConversations', () => {
  it('returns an available partner with their name, photo and trust level', async () => {
    const supabase = client(
      MINE,
      CONVERSATION,
      PARTNER_ROW,
      NO_BLOCKS,
      ok([{ id: 'u2', profile_photo: 'p.jpg', trust_level: 1 }])
    );

    const { data, error } = await getConversations(supabase, 'u1');

    expect(error).toBeUndefined();
    expect(data).toEqual([
      {
        id: 'c1',
        last_message: 'Hi',
        last_message_time: '2026-09-30T10:00:00Z',
        created_at: '2026-09-01T00:00:00Z',
        other_user_id: 'u2',
        other_user_name: 'Bikal Shrestha',
        other_user_photo: 'p.jpg',
        other_user_trust_level: 1,
        other_user_available: true,
        unread_count: 2,
      },
    ]);
  });

  it('marks a partner pending deletion unavailable: the profile is hidden, the participant row stays', async () => {
    const supabase = client(MINE, CONVERSATION, PARTNER_ROW, NO_BLOCKS, ok([]));

    const { data } = await getConversations(supabase, 'u1');

    expect(data?.[0]).toMatchObject({
      other_user_id: 'u2',
      other_user_name: UNAVAILABLE_ACCOUNT_NAME,
      other_user_photo: null,
      other_user_available: false,
    });
  });

  it('keeps a conversation whose partner was purged, with no partner id', async () => {
    const supabase = client(MINE, CONVERSATION, ok([]), NO_BLOCKS);

    const { data } = await getConversations(supabase, 'u1');

    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({
      other_user_id: null,
      other_user_name: UNAVAILABLE_ACCOUNT_NAME,
      other_user_available: false,
    });
  });

  it("fails when the partners' profiles can't be read, rather than calling everyone unavailable", async () => {
    const supabase = client(MINE, CONVERSATION, PARTNER_ROW, NO_BLOCKS, {
      data: null,
      error: { message: 'boom', code: 'XX000' },
    });

    const { data, error } = await getConversations(supabase, 'u1');

    expect(data).toBeUndefined();
    expect(error?.message).toBe('Failed to fetch conversations');
  });

  it('still leaves out a conversation with a blocked partner', async () => {
    const supabase = client(
      MINE,
      CONVERSATION,
      PARTNER_ROW,
      ok([{ blocker_id: 'u1', blocked_id: 'u2' }]),
      ok([{ id: 'u2', profile_photo: null, trust_level: 1 }])
    );

    const { data } = await getConversations(supabase, 'u1');

    expect(data).toEqual([]);
  });
});
