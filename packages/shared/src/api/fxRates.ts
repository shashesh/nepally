/**
 * Shared FX Rates API — lazy-refreshed cache of exchange rates.
 *
 * Reads the cached row; if stale (>24h) or missing, fetches a fresh rate from
 * https://open.er-api.com/v6/latest/USD (free, no key), upserts, and returns
 * the new value. If the refresh fails and a cached row exists, the cached row
 * is returned so the UI never shows a blank card.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const FX_SOURCE_URL = 'https://open.er-api.com/v6/latest/USD';
const FX_SOURCE_NAME = 'open.er-api.com';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ExchangeRate {
  pair: 'USD_NPR';
  rate: number;
  fetchedAt: string; // ISO
}

interface Result {
  data?: ExchangeRate;
  error?: Error;
}

type Fetcher = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

interface CacheRow {
  pair: string;
  rate: number;
  source: string;
  fetched_at: string;
}

async function readCache(supabase: SupabaseClient): Promise<CacheRow | null> {
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .eq('pair', 'USD_NPR')
    .maybeSingle();
  if (error) throw error;
  return (data as CacheRow | null) ?? null;
}

async function writeCache(
  supabase: SupabaseClient,
  rate: number,
  nowIso: string
): Promise<CacheRow> {
  const { data, error } = await supabase
    .from('fx_rates')
    .upsert({
      pair: 'USD_NPR',
      rate,
      source: FX_SOURCE_NAME,
      fetched_at: nowIso,
      updated_at: nowIso,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CacheRow;
}

async function fetchFreshRate(fetcher: Fetcher): Promise<number> {
  const res = await fetcher(FX_SOURCE_URL);
  if (!res.ok) throw new Error('FX upstream returned non-ok response');
  const body = (await res.json()) as { rates?: Record<string, unknown> };
  const npr = body?.rates?.NPR;
  if (typeof npr !== 'number' || !Number.isFinite(npr) || npr <= 0) {
    throw new Error('FX upstream returned invalid NPR rate');
  }
  return npr;
}

function isFresh(fetchedAt: string, now: Date): boolean {
  const age = now.getTime() - new Date(fetchedAt).getTime();
  return age >= 0 && age < MAX_AGE_MS;
}

function toExchangeRate(row: CacheRow): ExchangeRate {
  return { pair: 'USD_NPR', rate: row.rate, fetchedAt: row.fetched_at };
}

/**
 * Get the USD↔NPR exchange rate with lazy refresh.
 *
 * @param fetcher injectable `fetch`-like function. Defaults to the global `fetch`.
 * @param now injectable "now" for tests. Defaults to `new Date()`.
 */
export async function getExchangeRate(
  supabase: SupabaseClient,
  fetcher: Fetcher = globalThis.fetch.bind(globalThis) as Fetcher,
  now: Date = new Date()
): Promise<Result> {
  let cache: CacheRow | null = null;
  try {
    cache = await readCache(supabase);
  } catch (error) {
    return { error: toError(error, 'Failed to read FX cache') };
  }

  if (cache && isFresh(cache.fetched_at, now)) {
    return { data: toExchangeRate(cache) };
  }

  try {
    const fresh = await fetchFreshRate(fetcher);
    const row = await writeCache(supabase, fresh, now.toISOString());
    return { data: toExchangeRate(row) };
  } catch (error) {
    if (cache) {
      return { data: toExchangeRate(cache) };
    }
    return { error: toError(error, 'Failed to refresh FX rate') };
  }
}
