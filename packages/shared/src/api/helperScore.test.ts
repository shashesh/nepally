import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getHelperScore, getTopHelperInMetro } from './helperScore';

function makeSingleChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle.mockResolvedValue(final);
  return chain;
}

describe('getHelperScore', () => {
  it('returns the helper_score when a row exists', async () => {
    const chain = makeSingleChain({
      data: { user_id: 'u-1', helper_score: 42, helpful_comments: 15, likes_received_on_own_posts: 12 },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getHelperScore(supabase, 'u-1');

    expect(supabase.from).toHaveBeenCalledWith('user_helper_scores');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(res.data?.helperScore).toBe(42);
  });

  it('returns score 0 when the row is absent (banned or brand new)', async () => {
    const chain = makeSingleChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getHelperScore(supabase, 'u-2');
    expect(res.data?.helperScore).toBe(0);
  });

  it('returns error on query failure', async () => {
    const chain = makeSingleChain({ data: null, error: new Error('boom') });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getHelperScore(supabase, 'u-3');
    expect(res.error).toBeInstanceOf(Error);
    expect(res.data).toBeUndefined();
  });
});

describe('getTopHelperInMetro', () => {
  function makeListChain(final: { data: unknown; error: unknown }) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ['select', 'eq', 'gte', 'order', 'limit']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    (chain as unknown as { then: (res: (v: unknown) => unknown) => Promise<unknown> }).then =
      (res: (v: unknown) => unknown) => Promise.resolve(res(final));
    return chain;
  }

  it('returns the single highest-scoring non-viewer in the metro', async () => {
    const chain = makeListChain({
      data: [
        { user_id: 'u-1', helper_score: 80, metro_area_id: 'm-1' },
      ],
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getTopHelperInMetro(supabase, 'm-1', 'viewer-1');

    expect(supabase.from).toHaveBeenCalledWith('user_helper_scores');
    expect(chain.eq).toHaveBeenCalledWith('metro_area_id', 'm-1');
    expect(chain.gte).toHaveBeenCalledWith('helper_score', 10);
    expect(chain.order).toHaveBeenCalledWith('helper_score', { ascending: false });
    expect(res.data?.userId).toBe('u-1');
    expect(res.data?.helperScore).toBe(80);
  });

  it('skips the viewer when they are the top helper', async () => {
    const chain = makeListChain({
      data: [
        { user_id: 'viewer-1', helper_score: 99, metro_area_id: 'm-1' },
        { user_id: 'u-2', helper_score: 60, metro_area_id: 'm-1' },
      ],
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getTopHelperInMetro(supabase, 'm-1', 'viewer-1');
    expect(res.data?.userId).toBe('u-2');
  });

  it('returns null when no qualifying helper exists', async () => {
    const chain = makeListChain({ data: [], error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getTopHelperInMetro(supabase, 'm-1', 'viewer-1');
    expect(res.data).toBeNull();
    expect(res.error).toBeUndefined();
  });
});
