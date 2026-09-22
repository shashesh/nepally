import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMetroAreaById, getMetroByZip, isZipCodeNotFoundError, ZIP_CODE_NOT_FOUND_MESSAGE } from './metroArea';

function makeChain(final: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'single']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.single.mockResolvedValue(final);
  return chain;
}

/** Same shape as makeChain, but for getMetroByZip's .maybeSingle() query. */
function makeZipChain(final: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'maybeSingle']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle.mockResolvedValue(final);
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

describe('getMetroByZip', () => {
  it('returns the joined metro area for a known ZIP', async () => {
    const chain = makeZipChain({
      data: {
        metro_area_id: 'm-1',
        metro_areas: { id: 'm-1', name: 'Dallas', state: 'TX', population: 7500000 },
      },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getMetroByZip(supabase, '75001');

    expect(supabase.from).toHaveBeenCalledWith('metro_area_zipcodes');
    expect(chain.eq).toHaveBeenCalledWith('zip_code', '75001');
    expect(res.error).toBeUndefined();
    expect(res.data).toEqual({ id: 'm-1', name: 'Dallas', state: 'TX', population: 7500000 });
  });

  it('gives a not-found error the helper recognizes when no row matches (.maybeSingle(), not a PostgREST error)', async () => {
    const chain = makeZipChain({ data: null, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getMetroByZip(supabase, '99999');

    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe(ZIP_CODE_NOT_FOUND_MESSAGE);
    expect(isZipCodeNotFoundError(res.error)).toBe(true);
  });

  it('gives a not-found error the helper recognizes when the row has no joined metro area', async () => {
    const chain = makeZipChain({
      data: { metro_area_id: 'orphan', metro_areas: null },
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getMetroByZip(supabase, '99999');

    expect(res.error?.message).toBe('Metro area not found for ZIP code');
    expect(isZipCodeNotFoundError(res.error)).toBe(true);
  });

  it('wraps a real PostgREST error in a generic message, preserves it as cause, and the helper does not recognize it', async () => {
    // postgrest-js's default (non-.throwOnError()) mode never returns a real
    // Error/PostgrestError instance for a query error — it's always the
    // parsed response body, a plain object.
    const postgrestError = { message: 'permission denied for table metro_area_zipcodes', code: '42501' };
    const chain = makeZipChain({ data: null, error: postgrestError });
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getMetroByZip(supabase, '75001');

    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe('Failed to fetch metro area');
    expect((res.error as Error & { cause?: unknown }).cause).toBe(postgrestError);
    expect(isZipCodeNotFoundError(res.error)).toBe(false);
  });

  it('keeps a thrown TypeError as-is (a real network/timeout failure)', async () => {
    const chain = makeZipChain(undefined);
    chain.maybeSingle.mockRejectedValue(new TypeError('fetch failed'));
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const res = await getMetroByZip(supabase, '75001');

    expect(res.error).toBeInstanceOf(TypeError);
    expect(res.error?.message).toBe('fetch failed');
    expect(isZipCodeNotFoundError(res.error)).toBe(false);
  });
});

describe('isZipCodeNotFoundError', () => {
  it('is false for null/undefined', () => {
    expect(isZipCodeNotFoundError(null)).toBe(false);
    expect(isZipCodeNotFoundError(undefined)).toBe(false);
  });

  it('is false for an unrelated Error', () => {
    expect(isZipCodeNotFoundError(new Error('Something else'))).toBe(false);
  });
});
