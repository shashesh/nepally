export const MIN_RECORD_ACTIVITY_INTERVAL_MS = 15_000;

interface ShouldRecordSessionActivityParams {
  isAuthenticated: boolean;
  lastRecordedAt: number;
  now: number;
  minIntervalMs: number;
  force?: boolean;
}

export function shouldRecordSessionActivity({
  isAuthenticated,
  lastRecordedAt,
  now,
  minIntervalMs,
  force = false,
}: ShouldRecordSessionActivityParams): boolean {
  if (!isAuthenticated) return false;
  if (force) return true;
  return now - lastRecordedAt >= minIntervalMs;
}
