/**
 * Browser geolocation wrapper for web platform
 */
import { getMetroByZip } from '@nepally/shared';
import type {
  LocationPermissionStatus,
  GpsCoordinates,
  LocationDetectionResult,
} from '@nepally/shared';
import { supabase } from './supabase';

/**
 * Request location permission via browser geolocation API
 * The browser handles its own permission prompt
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  if (!navigator.geolocation) return 'denied';

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    if (result.state === 'granted') return 'granted';
    if (result.state === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Get current GPS coordinates via browser geolocation
 * Returns null on failure or timeout (10s)
 */
export function getCurrentPosition(): Promise<GpsCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeoutId = setTimeout(() => resolve(null), 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timeoutId);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minute cache
      }
    );
  });
}

/**
 * Reverse geocode coordinates to ZIP code using Nominatim (free, no API key)
 */
export async function reverseGeocodeToZip(
  coords: GpsCoordinates
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
      {
        headers: { 'User-Agent': 'Nepally-Community-App' },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data?.address?.postcode ?? null;
  } catch {
    return null;
  }
}

/**
 * Full detection pipeline: GPS → ZIP → Metro
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
