/**
 * Pure location utility functions (no platform dependencies)
 */
import type { LocationSnooze } from '../types/location';
import { LOCATION_SNOOZE_HOURS } from '../constants/location';

/**
 * Check if a metro area is currently snoozed
 */
export function isMetroSnoozed(
  metroAreaId: string,
  snoozes: LocationSnooze[]
): boolean {
  const snooze = snoozes.find((s) => s.metro_area_id === metroAreaId);
  if (!snooze) return false;
  return new Date(snooze.snoozed_until) > new Date();
}

/**
 * Create a snooze entry for a metro area (expires after LOCATION_SNOOZE_HOURS)
 */
export function createSnoozeEntry(metroAreaId: string): LocationSnooze {
  const snoozedUntil = new Date();
  snoozedUntil.setHours(snoozedUntil.getHours() + LOCATION_SNOOZE_HOURS);
  return {
    metro_area_id: metroAreaId,
    snoozed_until: snoozedUntil.toISOString(),
  };
}

/**
 * Check if the detected metro differs from the active metro
 */
export function hasMetroChanged(
  activeMetroId: string | null,
  detectedMetroId: string
): boolean {
  return activeMetroId !== detectedMetroId;
}

/**
 * Determine whether to show the permission-denied banner
 */
export function shouldShowPermissionBanner(
  showCount: number,
  lastShownAt: string | null,
  maxShows: number,
  cooldownDays: number
): boolean {
  if (showCount >= maxShows) return false;
  if (!lastShownAt) return true;

  const daysSinceLastShow =
    (Date.now() - new Date(lastShownAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastShow >= cooldownDays;
}

/**
 * Shorten a full metro name for display
 * e.g. "Dallas-Fort Worth-Arlington, TX" → "Dallas-Fort Worth"
 */
export function getShortMetroName(fullName: string): string {
  // Remove state suffix (everything after last comma)
  const withoutState = fullName.replace(/,\s*[A-Z]{2}(-[A-Z]{2})*$/, '');
  // Remove the last hyphenated segment if there are 3+ segments
  const segments = withoutState.split('-');
  if (segments.length >= 3) {
    return segments.slice(0, -1).join('-');
  }
  return withoutState;
}
