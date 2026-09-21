import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMetroAreaById } from './metroArea';

function makeChain(final: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'single']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.single.mockResolvedValue(final);
  return chain;
}

describe('getMetroAreaById', () => {
  it('selects the metro area row by id', async () => {
    const chain = makeChain({
      data: { id: 'm-1', name: 'Dallas', state: 'TX', population: 7500000 },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getMetroAreaById(supabase, 'm-1');

    expect(supabase.from).toHaveBeenCalledWith('metro_areas');
    expect(chain.select).toHaveBeenCalledWith('id, name, state, population');
    expect(chain.eq).toHaveBeenCalledWith('id', 'm-1');
    expect(res.error).toBeUndefined();
    expect(res.data).toEqual({ id: 'm-1', name: 'Dallas', state: 'TX', population: 7500000 });
  });

  it('returns an error when no such metro exists', async () => {
    const chain = makeChain({
      data: null,
      error: Object.assign(new Error('Row not found'), { code: 'PGRST116' }),
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getMetroAreaById(supabase, 'missing-id');

    expect(res.data).toBeUndefined();
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error?.message).toBe('Row not found');
  });
});
