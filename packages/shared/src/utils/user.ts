/**
 * User utility functions
 */

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
