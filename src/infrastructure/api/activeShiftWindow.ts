/**
 * How far back an open (still-running) shift is searched for.
 *
 * The client repository and the mock API both derive their window from this
 * module, so they always agree on what counts as "currently running": a shift
 * too old for the app to find also no longer blocks starting a new one. Without
 * that agreement a forgotten clock-in would be invisible in the UI yet still
 * rejected with `409 CONFLICT`, leaving the user unable to start or end a shift.
 */

import { addDays, getWeekStartKey } from '@/core/utils/time';

/** Number of weeks before the current week that is still searched. */
export const ACTIVE_SHIFT_LOOKBACK_WEEKS = 1;

/** `YYYY-MM-DD` week starts to search, newest first (current week, then back). */
export function activeShiftWindowWeekStarts(today: Date = new Date()): string[] {
  const weekStarts: string[] = [];
  for (let weeksBack = 0; weeksBack <= ACTIVE_SHIFT_LOOKBACK_WEEKS; weeksBack += 1) {
    weekStarts.push(getWeekStartKey(addDays(today, -7 * weeksBack)));
  }
  return weekStarts;
}
