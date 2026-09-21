/**
 * Shared Metro Area API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { MetroArea, MetroAreaResult } from '../types/metro';

type MetroAreasJoinRow = {
  metro_areas: MetroArea | MetroArea[] | null;
};

/**
 * Get metro area by ZIP code.
 * Queries the metro_area_zipcodes join table to find the metro area for a given ZIP.
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
      .single();

    if (error) throw error;
    if (!data) throw new Error('ZIP code not found');

    const metroAreaRow = data as unknown as MetroAreasJoinRow;
    const metroAreaData = Array.isArray(metroAreaRow.metro_areas)
      ? metroAreaRow.metro_areas[0]
      : metroAreaRow.metro_areas;

    if (!metroAreaData) {
      throw new Error('Metro area not found for ZIP code');
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
    return {
      error: error instanceof Error
        ? error
        : new Error('Failed to fetch metro area'),
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
      error: error instanceof Error
        ? error
        : new Error('Failed to fetch metro area'),
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
      error: error instanceof Error
        ? error
        : new Error('Failed to search metro areas'),
    };
  }
}
