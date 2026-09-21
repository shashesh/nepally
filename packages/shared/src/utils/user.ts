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

/**
 * The first word of a full name, for casual references ("Bikal hasn't posted
 * anything yet"). Returns '' for a blank name.
 */
export function getFirstName(fullName: string): string {
  if (!fullName || !fullName.trim()) return '';
  return fullName.trim().split(/\s+/)[0];
}

/**
 * Initials for avatar placeholders: first + last word initials, or the first two
 * letters of a single word. "?" when the name is blank.
 *
 * Operates on Unicode code points (via Array.from), not UTF-16 code units, so a
 * name starting with an astral-plane character (e.g. an emoji) isn't split into
 * a lone surrogate.
 */
export function getInitials(fullName: string): string {
  const chars = (s: string) => Array.from(s);
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return chars(parts[0]).slice(0, 2).join('').toUpperCase();
  return (chars(parts[0])[0] + chars(parts[parts.length - 1])[0]).toUpperCase();
}

/** Deterministic tone for an avatar placeholder, in [0, toneCount). */
export function getAvatarToneIndex(name: string, toneCount: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % toneCount;
}
