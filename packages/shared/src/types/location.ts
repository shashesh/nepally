/**
 * Location types — snake_case matching Supabase database columns
 * See: supabase/migrations/004_user_saved_locations.sql
 */

/** Saved location from the user_saved_locations table */
export interface SavedLocation {
  id: string;
  user_id: string;
  metro_area_id: string;
  label: string;
  zip_code: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Joined metro area data (populated via select) */
  metro_area?: {
    id: string;
    name: string;
    state: string;
  };
}

/** Result of GPS → ZIP → Metro detection pipeline */
export interface LocationDetectionResult {
  metro_area_id: string;
  metro_name: string;
  metro_state: string;
  zip_code: string;
  source: 'gps';
}

/** The active location the feed currently shows */
export interface ActiveLocation {
  metro_area_id: string;
  metro_name: string;
  metro_state: string;
  source: 'gps' | 'manual' | 'saved';
  is_temporary: boolean;
}

/** Location permission status (cross-platform) */
export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

/** Snooze entry — suppress location change prompt for a metro */
export interface LocationSnooze {
  metro_area_id: string;
  snoozed_until: string; // ISO 8601
}

/** User's choice when prompted about a detected location change */
export type LocationChangeAction = 'browse' | 'update' | 'keep';

/** Tracks how many times the permission banner has been shown */
export interface PermissionBannerState {
  show_count: number;
  last_shown_at: string | null; // ISO 8601
}

/** GPS coordinates from device location */
export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
