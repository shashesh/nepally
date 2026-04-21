import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
} from './follows';

function makeChain(final: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'insert', 'delete', 'order', 'limit', 'range', 'single', 'maybeSingle']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.single.mockResolvedValue(final);
  chain.maybeSingle.mockResolvedValue(final);
  return chain;
}

describe('follows api', () => {
  it('followUser inserts a row and returns data', async () => {
    const chain = makeChain({
      data: {
        id: 'f-1',
        follower_id: 'u-1',
        followee_id: 'u-2',
        created_at: '2026-04-20T00:00:00Z',
      },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await followUser(supabase, 'u-1', 'u-2');

    expect(supabase.from).toHaveBeenCalledWith('user_follows');
    expect(chain.insert).toHaveBeenCalledWith({
      follower_id: 'u-1',
      followee_id: 'u-2',
    });
    expect(res.error).toBeUndefined();
    expect(res.data?.follower_id).toBe('u-1');
  });

  it('followUser treats duplicate-key errors as idempotent success', async () => {
    const chain = makeChain({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await followUser(supabase, 'u-1', 'u-2');

    expect(res.error).toBeUndefined();
    expect(res.alreadyFollowing).toBe(true);
  });

  it('followUser rejects self-follow client-side before calling supabase', async () => {
    const supabase = { from: vi.fn() } as unknown as SupabaseClient;
    const res = await followUser(supabase, 'u-1', 'u-1');

    expect(res.error).toBeDefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('unfollowUser deletes the row', async () => {
    const chain = makeChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await unfollowUser(supabase, 'u-1', 'u-2');

    expect(supabase.from).toHaveBeenCalledWith('user_follows');
    expect(chain.delete).toHaveBeenCalled();
    expect(res.error).toBeUndefined();
  });

  it('isFollowing returns true when row exists', async () => {
    const chain = makeChain({ data: { id: 'f-1' }, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await isFollowing(supabase, 'u-1', 'u-2');

    expect(res.data).toBe(true);
  });

  it('isFollowing returns false when row is absent', async () => {
    const chain = makeChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await isFollowing(supabase, 'u-1', 'u-2');

    expect(res.data).toBe(false);
  });

  it('getFollowers returns list sorted by created_at desc', async () => {
    const chain = makeChain({ data: null, error: null });
    const list = [
      { id: 'f-1', follower_id: 'a', followee_id: 'u-1', created_at: '2' },
      { id: 'f-2', follower_id: 'b', followee_id: 'u-1', created_at: '1' },
    ];
    chain.range.mockResolvedValue({ data: list, error: null });

    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getFollowers(supabase, 'u-1', { limit: 20, offset: 0 });

    expect(chain.eq).toHaveBeenCalledWith('followee_id', 'u-1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(res.data?.length).toBe(2);
  });

  it('getFollowing filters by follower_id', async () => {
    const chain = makeChain({ data: null, error: null });
    chain.range.mockResolvedValue({ data: [], error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await getFollowing(supabase, 'u-1', { limit: 10, offset: 0 });

    expect(chain.eq).toHaveBeenCalledWith('follower_id', 'u-1');
  });
});
