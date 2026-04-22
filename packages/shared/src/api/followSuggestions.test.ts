import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getFollowSuggestionCandidates } from './followSuggestions';

function makeListChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as unknown as { then: (res: (v: unknown) => unknown) => Promise<unknown> }).then =
    (res: (v: unknown) => unknown) => Promise.resolve(res(final));
  return chain;
}

describe('getFollowSuggestionCandidates', () => {
  it('queries users in the same metro and excludes the viewer + banned', async () => {
    const usersChain = makeListChain({
      data: [
        {
          id: 'u-1', full_name: 'Anish Shrestha', hometown_district: 'Pokhara',
          college: 'Pulchowk', trust_level: 1, follower_count: 3,
          created_at: '2026-02-01T00:00:00Z', profile_photo: null,
        },
      ],
      error: null,
    });
    const followsChain = makeListChain({ data: [], error: null });
    const blocksChain = makeListChain({ data: [], error: null });

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(followsChain)
        .mockReturnValueOnce(blocksChain),
    } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(usersChain.eq).toHaveBeenCalledWith('metro_area_id', 'm-dfw');
    expect(usersChain.eq).toHaveBeenCalledWith('is_banned', false);
    expect(usersChain.neq).toHaveBeenCalledWith('id', 'viewer-1');
    expect(res.data?.length).toBe(1);
    expect(res.data?.[0].id).toBe('u-1');
  });

  it('filters out users the viewer already follows', async () => {
    const usersChain = makeListChain({
      data: [
        { id: 'u-1', full_name: 'A', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
        { id: 'u-2', full_name: 'B', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
      ],
      error: null,
    });
    const followsChain = makeListChain({
      data: [{ followee_id: 'u-2' }],
      error: null,
    });
    const blocksChain = makeListChain({ data: [], error: null });

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(followsChain)
        .mockReturnValueOnce(blocksChain),
    } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');
    expect(res.data?.map((c) => c.id)).toEqual(['u-1']);
  });

  it('filters out users in either direction of a block relationship', async () => {
    const usersChain = makeListChain({
      data: [
        { id: 'u-1', full_name: 'A', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
        { id: 'u-2', full_name: 'B', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
        { id: 'u-3', full_name: 'C', hometown_district: null, college: null, trust_level: 1, follower_count: 0, created_at: '2026-01-01T00:00:00Z', profile_photo: null },
      ],
      error: null,
    });
    const followsChain = makeListChain({ data: [], error: null });
    const blocksChain = makeListChain({
      data: [
        { blocker_id: 'viewer-1', blocked_id: 'u-1' },
        { blocker_id: 'u-3', blocked_id: 'viewer-1' },
      ],
      error: null,
    });

    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(usersChain)
        .mockReturnValueOnce(followsChain)
        .mockReturnValueOnce(blocksChain),
    } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');
    expect(res.data?.map((c) => c.id)).toEqual(['u-2']);
  });

  it('returns error when the users query fails', async () => {
    const usersChain = makeListChain({ data: null, error: new Error('boom') });
    const supabase = { from: vi.fn().mockReturnValueOnce(usersChain) } as unknown as SupabaseClient;

    const res = await getFollowSuggestionCandidates(supabase, 'viewer-1', 'm-dfw');
    expect(res.error).toBeInstanceOf(Error);
  });
});
