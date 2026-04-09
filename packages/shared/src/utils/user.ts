/**
 * User utility functions
 */

import { TrustLevel } from '../constants/trustLevels';

/**
 * Returns a human-readable label for a trust level.
 */
export function getTrustLabel(level: number): string {
  switch (level) {
    case TrustLevel.NEW:
      return 'New Member';
    case TrustLevel.VERIFIED:
      return 'Verified';
    case TrustLevel.CONTRIBUTOR:
      return 'Contributor';
    default:
      return 'Unknown';
  }
}

/**
 * Formats a full name for public display: "Shashank Kumar" → "Shashank K."
 * Preserves privacy by showing only the first letter of the last name.
 * Returns just the first name if only one word is given.
 */
export function formatPublicName(fullName: string): string {
  if (!fullName || !fullName.trim()) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${firstName} ${lastInitial}.`;
}
