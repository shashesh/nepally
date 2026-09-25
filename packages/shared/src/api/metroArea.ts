/**
 * Shared Metro Area API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { toApiError } from '../utils/apiError';
import type { MetroArea, MetroAreaResult } from '../types/metro';

type MetroAreasJoinRow = {
  metro_areas: MetroArea | MetroArea[] | null;
};

/** getMetroByZip's own message when the ZIP has no row in metro_area_zipcodes. */
export const ZIP_CODE_NOT_FOUND_MESSAGE = 'ZIP code not found';

/**
 * getMetroByZip's own message for a joined row with no linked metro area.
 * Defensive only — a foreign-key constraint should make this unreachable in
 * practice, but it is still a "no match", not a failure, if it ever happens.
 */
const METRO_AREA_MISSING_FOR_ZIP_MESSAGE = 'Metro area not found for ZIP code';

/**
 * True when `error` is one of getMetroByZip's own "this ZIP has no match"
 * throws, as opposed to a genuine failure (network, timeout, a real
 * PostgREST/server error) — callers use this to show "no results" instead
 * of a failure message. Anything else, including the generic wrapped
 * message getMetroByZip's catch block produces, is a real failure.
 */
export function isZipCodeNotFoundError(error: Error | null | undefined): boolean {
  if (!error) return false;
  return error.message === ZIP_CODE_NOT_FOUND_MESSAGE || error.message === METRO_AREA_MISSING_FOR_ZIP_MESSAGE;
}

/**
 * Get metro area by ZIP code.
 * Queries the metro_area_zipcodes join table to find the metro area for a given ZIP.
 *
 * Uses `.maybeSingle()`, not `.single()`: a ZIP with no row is a normal,
 * expected outcome — `.maybeSingle()` reports it as `{ data: null, error:
 * null }` rather than a PostgREST error. That matters because postgrest-js's
 * default (non-`.throwOnError()`) mode never throws or returns a real
 * `Error`/`PostgrestError` instance for *any* query error — not-found, a
 * real 5xx, a network/timeout failure all arrive as a plain parsed-JSON
 * object — so once one reaches this function's catch block, there is no
 * reliable way to tell "not found" apart from a genuine failure again.
 * Routing the common not-found case around that path entirely, via
 * `.maybeSingle()` and an explicit throw here, keeps it a real `Error` this
 * function constructs itself, with `isZipCodeNotFoundError` able to
 * recognize it by message; a `.maybeSingle()` error (still a plain object,
 * for the rarer real-failure case) still lands in the generic branch below.
 */
export async function getMetroByZip(
  supabase: SupabaseClient,
  zipCode: string
): Promise<MetroAreaResult> {
  try {
    const { data, error } = await supabase
      .from('metro_area_zipcodes')
      .select(`
        metro_area_id,
        metro_areas (
          id,
          name,
          state,
          population
        )
      `)
      .eq('zip_code', zipCode)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(ZIP_CODE_NOT_FOUND_MESSAGE);

    const metroAreaRow = data as unknown as MetroAreasJoinRow;
    const metroAreaData = Array.isArray(metroAreaRow.metro_areas)
      ? metroAreaRow.metro_areas[0]
      : metroAreaRow.metro_areas;

    if (!metroAreaData) {
      throw new Error(METRO_AREA_MISSING_FOR_ZIP_MESSAGE);
    }

    return {
      data: {
        id: metroAreaData.id,
        name: metroAreaData.name,
        state: metroAreaData.state,
        population: metroAreaData.population,
      },
    };
  } catch (error) {
    // Keep the member-facing message generic for a real failure — mobile's
    // useMetroArea shows this raw — but keep the original on `cause` for
    // logging. `{ cause }` as a constructor argument needs an ES2022+ lib,
    // which this package doesn't target; Object.assign sets the same
    // standard `.cause` property without that requirement.
    return {
      error:
        error instanceof Error
          ? error
          : Object.assign(toApiError(error, 'Failed to fetch metro area'), { cause: error }),
    };
  }
}

/**
 * Get a single metro area by id. Errors when no such metro exists.
 */
export async function getMetroAreaById(
  supabase: SupabaseClient,
  metroAreaId: string
): Promise<MetroAreaResult> {
  try {
    const { data, error } = await supabase
      .from('metro_areas')
      .select('id, name, state, population')
      .eq('id', metroAreaId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Metro area not found');

    return { data: data as MetroArea };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to fetch metro area'),
    };
  }
}

/**
 * Search metro areas by name (case-insensitive partial match).
 * Returns up to 10 results.
 */
export async function searchMetroAreas(
  supabase: SupabaseClient,
  query: string
): Promise<{ data?: MetroArea[]; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('metro_areas')
      .select('id, name, state, population')
      .ilike('name', `%${query}%`)
      .order('population', { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) throw error;

    return { data: (data ?? []) as MetroArea[] };
  } catch (error) {
    return {
      error: toApiError(error, 'Failed to search metro areas'),
    };
  }
}
