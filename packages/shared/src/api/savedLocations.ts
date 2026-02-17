/**
 * Saved Locations API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { SavedLocation } from '../types/location';

interface SavedLocationResult {
  data?: SavedLocation;
  error?: Error;
}

interface SavedLocationsResult {
  data?: SavedLocation[];
  error?: Error;
}

/** Convert a Supabase/PostgREST error (plain object) to a proper Error */
function toError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(String((err as { message: string }).message));
  }
  return new Error(fallback);
}

/** Standard select clause for saved locations with joined metro data */
const SAVED_LOCATION_SELECT = `
  *,
  metro_area:metro_areas (
    id,
    name,
    state
  )
`;

/**
 * Get all saved locations for a user, ordered by sort_order
 */
export async function getSavedLocations(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedLocationsResult> {
  try {
    const { data, error } = await supabase
      .from('user_saved_locations')
      .select(SAVED_LOCATION_SELECT)
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return { data: (data ?? []) as SavedLocation[] };
  } catch (error) {
    return { error: toError(error, 'Failed to fetch saved locations') };
  }
}

/**
 * Add a new saved location.
 * If a location with the same label already exists for this user,
 * it is updated (upsert) instead of creating a duplicate.
 */
export async function addSavedLocation(
  supabase: SupabaseClient,
  userId: string,
  metroAreaId: string,
  label: string,
  zipCode?: string,
  isDefault?: boolean
): Promise<SavedLocationResult> {
  try {
    // If setting as default, unset any existing default first
    if (isDefault) {
      await supabase
        .from('user_saved_locations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
    }

    // Get the next sort_order
    const { data: existing } = await supabase
      .from('user_saved_locations')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from('user_saved_locations')
      .upsert(
        {
          user_id: userId,
          metro_area_id: metroAreaId,
          label,
          zip_code: zipCode ?? null,
          is_default: isDefault ?? false,
          sort_order: nextOrder,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,label' }
      )
      .select(SAVED_LOCATION_SELECT)
      .single();

    if (error) throw error;

    return { data: data as SavedLocation };
  } catch (error) {
    return { error: toError(error, 'Failed to add saved location') };
  }
}

/**
 * Update a saved location (label, sort_order, etc.)
 */
export async function updateSavedLocation(
  supabase: SupabaseClient,
  locationId: string,
  updates: Partial<Pick<SavedLocation, 'label' | 'sort_order'>>
): Promise<SavedLocationResult> {
  try {
    const { data, error } = await supabase
      .from('user_saved_locations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', locationId)
      .select(SAVED_LOCATION_SELECT)
      .single();

    if (error) throw error;

    return { data: data as SavedLocation };
  } catch (error) {
    return { error: toError(error, 'Failed to update saved location') };
  }
}

/**
 * Delete a saved location
 */
export async function deleteSavedLocation(
  supabase: SupabaseClient,
  locationId: string
): Promise<{ error?: Error }> {
  try {
    const { error } = await supabase
      .from('user_saved_locations')
      .delete()
      .eq('id', locationId);

    if (error) throw error;

    return {};
  } catch (error) {
    return { error: toError(error, 'Failed to delete saved location') };
  }
}

/**
 * Set a saved location as the default (unsets the previous default)
 */
export async function setDefaultSavedLocation(
  supabase: SupabaseClient,
  userId: string,
  locationId: string
): Promise<{ error?: Error }> {
  try {
    // Unset current default
    await supabase
      .from('user_saved_locations')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    // Set new default
    const { error } = await supabase
      .from('user_saved_locations')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', locationId);

    if (error) throw error;

    return {};
  } catch (error) {
    return { error: toError(error, 'Failed to set default location') };
  }
}
