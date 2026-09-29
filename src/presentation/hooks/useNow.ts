import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Returns the current epoch time, refreshed on a fixed interval.
 *
 * Used to derive "now"-dependent values (worked minutes, timers) from absolute
 * timestamps rather than accumulated ticks, so backgrounded time is always
 * accounted for. State is only ever written from a timer/AppState callback —
 * never synchronously inside the effect body.
 */
export function useNow(intervalMs = 1_000, active = true): number {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const interval = setInterval(() => setNowMs(Date.now()), intervalMs);

    // Resuming from the background forces an immediate recompute instead of
    // waiting up to `intervalMs` for the next tick.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNowMs(Date.now());
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [intervalMs, active]);

  return nowMs;
}
