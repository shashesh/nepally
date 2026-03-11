/**
 * Platform-specific location service using expo-location
 * Wraps GPS access, reverse geocoding, and the full detection pipeline
 */
import * as Location from 'expo-location';
import { getMetroByZip } from '@nusa/shared';
import type {
  LocationPermissionStatus,
  GpsCoordinates,
  LocationDetectionResult,
} from '@nusa/shared';
import { supabase } from '../config/supabase';

/**
 * Request foreground location permission from the user
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return mapExpoStatus(status);
}

/**
 * Get the current permission status without prompting
 */
export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return mapExpoStatus(status);
}

/**
 * Get the device's current GPS coordinates
 * Returns null on failure or timeout (10s)
 *
 * Uses a cancellation flag so that if a new call is made before the previous
 * GPS request resolves, the stale result is discarded rather than applied.
 */
let _activeGpsRequest: { cancelled: boolean } | null = null;

export async function getCurrentPosition(): Promise<GpsCoordinates | null> {
  // Cancel any previous pending request's result
  if (_activeGpsRequest) {
    _activeGpsRequest.cancelled = true;
  }
  const thisRequest = { cancelled: false };
  _activeGpsRequest = thisRequest;

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      thisRequest.cancelled = true;
      if (_activeGpsRequest === thisRequest) _activeGpsRequest = null;
      resolve(null);
    }, 10000);

    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })
      .then((location) => {
        clearTimeout(timeoutId);
        if (thisRequest.cancelled) {
          resolve(null);
          return;
        }
        if (_activeGpsRequest === thisRequest) _activeGpsRequest = null;
        resolve({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
        });
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (!thisRequest.cancelled) {
          console.error('Failed to get current position:', error);
        }
        if (_activeGpsRequest === thisRequest) _activeGpsRequest = null;
        resolve(null);
      });
  });
}

/**
 * Reverse geocode GPS coordinates to a ZIP code
 * Uses expo-location's built-in reverse geocoding
 */
export async function reverseGeocodeToZip(
  coords: GpsCoordinates
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (results.length > 0 && results[0].postalCode) {
      return results[0].postalCode;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocode failed:', error);
    return null;
  }
}

/**
 * Full detection pipeline: GPS → ZIP → Metro
 * Returns null if any step fails
 */
export async function detectLocationMetro(): Promise<LocationDetectionResult | null> {
  const coords = await getCurrentPosition();
  if (!coords) return null;

  const zipCode = await reverseGeocodeToZip(coords);
  if (!zipCode) return null;

  const result = await getMetroByZip(supabase, zipCode);
  if (result.error || !result.data) return null;

  return {
    metro_area_id: result.data.id,
    metro_name: result.data.name,
    metro_state: result.data.state,
    zip_code: zipCode,
    source: 'gps',
  };
}

function mapExpoStatus(
  status: Location.PermissionStatus
): LocationPermissionStatus {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted';
    case Location.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}
