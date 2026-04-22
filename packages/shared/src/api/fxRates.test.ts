import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getExchangeRate } from './fxRates';

function makeSelectChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'maybeSingle']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle.mockResolvedValue(final);
  return chain;
}

function makeUpsertChain(final: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['upsert', 'select', 'single']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single.mockResolvedValue(final);
  return chain;
}

describe('getExchangeRate', () => {
  it('returns cached rate when it is fresh (under 24h old)', async () => {
    const freshIso = '2026-04-20T12:00:00Z';
    const selectChain = makeSelectChain({
      data: { pair: 'USD_NPR', rate: 133.25, fetched_at: freshIso, source: 'open.er-api.com' },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(selectChain) } as unknown as SupabaseClient;
    const fetcher = vi.fn();

    const res = await getExchangeRate(
      supabase,
      fetcher as never,
      new Date('2026-04-20T18:00:00Z') // 6h after fetched_at → fresh
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(res.data?.rate).toBe(133.25);
    expect(res.data?.pair).toBe('USD_NPR');
    expect(res.data?.fetchedAt).toBe(freshIso);
  });

  it('refetches when cached rate is stale (>24h old) and upserts the new rate', async () => {
    const staleIso = '2026-04-18T00:00:00Z';
    const selectChain = makeSelectChain({
      data: { pair: 'USD_NPR', rate: 130.0, fetched_at: staleIso, source: 'open.er-api.com' },
      error: null,
    });
    const upsertChain = makeUpsertChain({
      data: { pair: 'USD_NPR', rate: 133.7, fetched_at: '2026-04-20T00:00:00Z', source: 'open.er-api.com' },
      error: null,
    });
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(upsertChain),
    } as unknown as SupabaseClient;

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', rates: { NPR: 133.7 } }),
    });

    const res = await getExchangeRate(
      supabase,
      fetcher,
      new Date('2026-04-20T00:00:00Z')
    );

    expect(fetcher).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD');
    expect(upsertChain.upsert).toHaveBeenCalled();
    expect(res.data?.rate).toBe(133.7);
  });

  it('fetches when cache row is absent', async () => {
    const selectChain = makeSelectChain({ data: null, error: null });
    const upsertChain = makeUpsertChain({
      data: { pair: 'USD_NPR', rate: 133.7, fetched_at: '2026-04-20T00:00:00Z', source: 'open.er-api.com' },
      error: null,
    });
    const supabase = {
      from: vi.fn().mockReturnValueOnce(selectChain).mockReturnValueOnce(upsertChain),
    } as unknown as SupabaseClient;

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', rates: { NPR: 133.7 } }),
    });

    const res = await getExchangeRate(supabase, fetcher, new Date('2026-04-20T00:00:00Z'));
    expect(fetcher).toHaveBeenCalled();
    expect(res.data?.rate).toBe(133.7);
  });

  it('falls back to the stale cached rate if the outbound fetch fails', async () => {
    const staleIso = '2026-04-18T00:00:00Z';
    const selectChain = makeSelectChain({
      data: { pair: 'USD_NPR', rate: 130.0, fetched_at: staleIso, source: 'open.er-api.com' },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(selectChain) } as unknown as SupabaseClient;
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    const res = await getExchangeRate(
      supabase,
      fetcher,
      new Date('2026-04-20T00:00:00Z')
    );
    expect(res.data?.rate).toBe(130.0);
    expect(res.data?.fetchedAt).toBe(staleIso);
  });

  it('returns an error when there is no cache AND fetch fails', async () => {
    const selectChain = makeSelectChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(selectChain) } as unknown as SupabaseClient;
    const fetcher = vi.fn().mockRejectedValue(new Error('network'));

    const res = await getExchangeRate(supabase, fetcher, new Date('2026-04-20'));
    expect(res.data).toBeUndefined();
    expect(res.error).toBeInstanceOf(Error);
  });
});
