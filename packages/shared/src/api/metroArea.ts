/**
 * Shared Metro Area API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { MetroAreaResult } from '../types/metro';

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

    const metroAreaData = data.metro_areas as any;

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
