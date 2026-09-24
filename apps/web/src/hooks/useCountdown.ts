import { useCallback, useEffect, useState } from 'react';

const TICK_MS = 1_000;

export interface Countdown {
  /** Whole seconds left; 0 when done. */
  remaining: number;
  restart: () => void;
}

function secondsUntil(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / TICK_MS));
}

/**
 * Counts down from `seconds` once a second, starting on mount.
 *
 * `remaining` is derived from an end time rather than decremented, so a
 * background tab whose timers are throttled still reads the right value.
 */
export function useCountdown(seconds: number): Countdown {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * TICK_MS);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const left = secondsUntil(endsAt);
      setRemaining(left);
      if (left === 0) clearInterval(intervalId);
    }, TICK_MS);
    return () => clearInterval(intervalId);
  }, [endsAt]);

  const restart = useCallback(() => {
    setEndsAt(Date.now() + seconds * TICK_MS);
    setRemaining(seconds);
  }, [seconds]);

  return { remaining, restart };
}
