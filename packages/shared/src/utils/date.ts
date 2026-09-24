/**
 * Date utility functions
 */

/**
 * "just now", "5m ago", "3h ago", "2d ago", "1w ago", else the date. Pass
 * `now` from a ticking clock (web's useNow) so a label on an open page ages.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

/**
 * Format a number for compact display (e.g. 1234 → "1.2K")
 */
export function formatCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10000) {
    const k = (count / 1000).toFixed(1);
    return k.endsWith('.0') ? `${Math.floor(count / 1000)}K` : `${k}K`;
  }
  return `${Math.floor(count / 1000)}K`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format cents as USD string: 199 -> "$1.99"
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Add days to a date, returning a new Date (does not mutate input).
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * A heading for one calendar day in local time: "Today", "Yesterday",
 * "Mar 5" earlier this year, "Mar 5, 2025" in another year.
 */
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  const today = startOfDay(now);
  const day = startOfDay(date);
  if (day === today) return 'Today';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  if (day === yesterday) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}
