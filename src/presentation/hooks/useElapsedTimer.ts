import { elapsedMsSince } from '@/core/utils/time';

import { useNow } from './useNow';

const TICK_INTERVAL_MS = 1_000;

/**
 * Live elapsed-time hook.
 *
 * The returned value is ALWAYS recomputed from the absolute shift start
 * timestamp via `elapsedMsSince`, never accumulated from previous ticks.
 * Backgrounding the app, locking the phone, or killing and reopening the
 * process therefore cannot make the timer drift: the next tick (or the
 * `AppState` foreground event) simply re-reads `Date.now()`.
 *
 * @param startIsoTimestamp ISO-8601 shift start, or `null` when idle.
 * @param running           Whether the timer should keep ticking.
 */
export function useElapsedTimer(startIsoTimestamp: string | null, running: boolean): number {
  const nowMs = useNow(TICK_INTERVAL_MS, running && startIsoTimestamp !== null);

  if (startIsoTimestamp === null) {
    return 0;
  }

  return elapsedMsSince(startIsoTimestamp, nowMs);
}
