/**
 * Shared Cultural Events API — reads seeded Nepali festival rows from DB.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CulturalEventRow {
  id: string;
  title: string;
  starts_on: string; // ISO date (YYYY-MM-DD)
  ends_on: string | null;
  description: string | null;
}

interface Result {
  data?: CulturalEventRow[];
  error?: Error;
}

const DEFAULT_WITHIN_DAYS = 30;
const MAX_ROWS = 10;

function toIsoDate(d: Date): string {
  // YYYY-MM-DD in UTC — seeded data uses date-only semantics
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

/**
 * Returns cultural events whose `starts_on` is between `now` and `now + withinDays`.
 *
 * @param now optional injected "now" for testing. Defaults to `new Date()`.
 */
export async function getUpcomingCulturalEvents(
  supabase: SupabaseClient,
  withinDays: number | undefined,
  now: Date = new Date()
): Promise<Result> {
  const days = withinDays ?? DEFAULT_WITHIN_DAYS;
  const lower = toIsoDate(now);
  const upper = toIsoDate(addDays(now, days));

  try {
    const { data, error } = await supabase
      .from('cultural_events')
      .select('*')
      .gte('starts_on', lower)
      .lte('starts_on', upper)
      .order('starts_on', { ascending: true })
      .limit(MAX_ROWS);

    if (error) throw error;
    return { data: (data ?? []) as CulturalEventRow[] };
  } catch (error) {
    return { error: toError(error, 'Failed to load cultural events') };
  }
}
