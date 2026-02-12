import { supabase } from '../../config/supabase';

interface MetroArea {
  id: string;
  name: string;
  state: string;
}

interface MetroAreaResult {
  data?: MetroArea;
  error?: Error;
}

/**
 * Get metro area by ZIP code
 * Queries the metro_area_zipcodes table to find the metro area for a given ZIP
 */
export async function getMetroByZip(zipCode: string): Promise<MetroAreaResult> {
  try {
    const { data, error } = await supabase
      .from('metro_area_zipcodes')
      .select(`
        metro_area_id,
        metro_areas (
          id,
          name,
          state
        )
      `)
      .eq('zip_code', zipCode)
      .single();

    if (error) throw error;
    if (!data) throw new Error('ZIP code not found');

    // Type assertion for the joined data
    const metroAreaData = data.metro_areas as any;

    return {
      data: {
        id: metroAreaData.id,
        name: metroAreaData.name,
        state: metroAreaData.state,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to fetch metro area'),
    };
  }
}

/**
 * Validate ZIP code format
 */
export function validateZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}
