/**
 * Date utility functions
 */

export function calculateExpiryDate(category: string): Date {
  const now = new Date();
  const expiryDays: Record<string, number> = {
    housing: 30,
    jobs: 30,
    emergency: 7,
    travel: 2,
  };

  const days = expiryDays[category] || 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
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

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
