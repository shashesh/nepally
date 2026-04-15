/**
 * Format a listing's created_at timestamp as a compact freshness label.
 * Used on mobile `ListingGridCard`.
 *
 * Contract:
 * - Under 60s  → "just now"
 * - Under 1h   → "{n}m"
 * - Under 1d   → "{n}h"
 * - Under 1w   → "{n}d"
 * - Under 30d  → "{n}w"
 * - Under 1y   → "{n}mo"
 * - 1y or more → "{n}y"
 * - Unparseable → "" (caller must handle)
 * - Future dates clamp to "just now"
 */
export function formatListingFreshness(
  createdAt: string,
  nowMs: number = Date.now()
): string {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return '';

  const deltaMs = Math.max(0, nowMs - created);
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}w`;

  const months = Math.floor(days / 30);
  if (days < 365) return `${months}mo`;

  const years = Math.floor(days / 365);
  return `${years}y`;
}
