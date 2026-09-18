import { useState, useEffect } from 'react';

const DEFAULT_REFRESH_MS = 60_000;

/**
 * The current time, refreshed every `refreshMs`.
 *
 * Components must not read the clock while rendering (react-hooks/purity), so
 * time-dependent labels ("Open now", "Expires in 3 days") take `now` from here.
 * The interval keeps them correct while a page stays open.
 */
export function useNow(refreshMs: number = DEFAULT_REFRESH_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), refreshMs);
    return () => clearInterval(intervalId);
  }, [refreshMs]);

  return now;
}
