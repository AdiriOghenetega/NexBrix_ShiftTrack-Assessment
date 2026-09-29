/**
 * Pure TypeScript time helpers.
 *
 * These functions are the single source of truth for every duration / timer
 * calculation in the app. They are deliberately free of React and React Native
 * imports so they can be unit-tested in isolation.
 */

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Number of milliseconds in a day, expressed in minutes (used for clamping). */
export const MINUTES_PER_DAY = 24 * 60;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad(value: number, length = 2): string {
  return String(Math.abs(Math.trunc(value))).padStart(length, '0');
}

/**
 * Parses an ISO-8601 timestamp into a POSIX epoch in milliseconds.
 * Throws a `RangeError` when the value is not a parseable date.
 */
export function toEpochMs(isoTimestamp: string): number {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) {
    throw new RangeError(`Invalid ISO-8601 timestamp: "${isoTimestamp}"`);
  }
  return parsed;
}

/** Safe variant of `toEpochMs` that returns `null` instead of throwing. */
export function tryParseEpochMs(isoTimestamp: string | null | undefined): number | null {
  if (!isoTimestamp) {
    return null;
  }
  const parsed = Date.parse(isoTimestamp);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Elapsed milliseconds between a start timestamp and "now".
 *
 * This is the primitive behind the live timer: because the elapsed time is
 * always derived from absolute timestamps, backgrounding or killing the app
 * cannot make the timer drift.
 */
export function elapsedMsSince(startIsoTimestamp: string, nowMs: number): number {
  return Math.max(0, nowMs - toEpochMs(startIsoTimestamp));
}

/** Elapsed whole seconds between a start timestamp and "now". */
export function elapsedSecondsSince(startIsoTimestamp: string, nowMs: number): number {
  return Math.floor(elapsedMsSince(startIsoTimestamp, nowMs) / SECOND_MS);
}

/** Gross duration (end - start) ignoring breaks. Returns 0 for negative ranges. */
export function grossDurationMs(startIsoTimestamp: string, endIsoTimestamp: string): number {
  return Math.max(0, toEpochMs(endIsoTimestamp) - toEpochMs(startIsoTimestamp));
}

/**
 * Worked milliseconds excluding the unpaid break.
 *
 * `endIsoTimestamp === null` means the shift is still running, in which case
 * `nowMs` is used as the end of the range.
 */
export function workedDurationMs(
  startIsoTimestamp: string,
  endIsoTimestamp: string | null,
  breakMinutes: number,
  nowMs: number,
): number {
  const end = endIsoTimestamp === null ? nowMs : toEpochMs(endIsoTimestamp);
  const gross = Math.max(0, end - toEpochMs(startIsoTimestamp));
  return Math.max(0, gross - breakMinutes * MINUTE_MS);
}

/** Same as `workedDurationMs` but rounded to whole minutes. */
export function workedDurationMinutes(
  startIsoTimestamp: string,
  endIsoTimestamp: string | null,
  breakMinutes: number,
  nowMs: number,
): number {
  return Math.round(workedDurationMs(startIsoTimestamp, endIsoTimestamp, breakMinutes, nowMs) / MINUTE_MS);
}

/** Formats a millisecond duration as `HH:MM:SS` (hours may exceed 99). */
export function formatTimer(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / SECOND_MS));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Formats minutes as a compact human label, e.g. `7h 30m`, `45m`, `8h`. */
export function formatMinutesAsDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours === 0) {
    return `${remainder}m`;
  }
  if (remainder === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainder}m`;
}

/** Decimal hours rounded to two decimals, e.g. `7.5`. */
export function toDecimalHours(minutes: number): number {
  return Math.round((Math.max(0, minutes) / 60) * 100) / 100;
}

/** Formats decimal hours, e.g. `7.5 h`. */
export function formatDecimalHours(minutes: number): string {
  return `${toDecimalHours(minutes).toFixed(2).replace(/\.00$/, '')} h`;
}

/**
 * Converts a `Date` into a local `YYYY-MM-DD` key.
 * Local (not UTC) so that the calendar day matches the user's device.
 */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Parses a local `YYYY-MM-DD` key into a `Date` at local midnight. */
export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function isValidTimeOfDay(value: string): boolean {
  return TIME_OF_DAY_PATTERN.test(value);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Returns local midnight of the first day of the week containing `date`. */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const base = startOfDay(date);
  const dayOffset = (base.getDay() - weekStartsOn + 7) % 7;
  return addDays(base, -dayOffset);
}

/** Local `YYYY-MM-DD` key of the Monday of the week containing `date`. */
export function getWeekStartKey(date: Date = new Date()): string {
  return toDateKey(startOfWeek(date));
}

/** Local `YYYY-MM-DD` key of the Sunday of the week containing `date`. */
export function getWeekEndKey(date: Date = new Date()): string {
  return toDateKey(addDays(startOfWeek(date), 6));
}

/**
 * Combines a local `YYYY-MM-DD` key with a `HH:MM` time into an ISO-8601
 * string (UTC). Throws a `RangeError` for malformed input.
 */
export function combineDateKeyAndTime(dateKey: string, timeOfDay: string): string {
  if (!isValidDateKey(dateKey)) {
    throw new RangeError(`Invalid date key: "${dateKey}"`);
  }
  if (!isValidTimeOfDay(timeOfDay)) {
    throw new RangeError(`Invalid time of day: "${timeOfDay}" (expected HH:MM, 24h)`);
  }
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  const [hours, minutes] = timeOfDay.split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** e.g. `Mon 29 Sep`. */
export function formatDayLabel(isoTimestampOrDateKey: string): string {
  const date = isValidDateKey(isoTimestampOrDateKey)
    ? fromDateKey(isoTimestampOrDateKey)
    : new Date(isoTimestampOrDateKey);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${DAY_LABELS[date.getDay()]} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
}

/** e.g. `29 Sep 2026`. */
export function formatFullDateLabel(isoTimestampOrDateKey: string): string {
  const date = isValidDateKey(isoTimestampOrDateKey)
    ? fromDateKey(isoTimestampOrDateKey)
    : new Date(isoTimestampOrDateKey);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Local 24h clock label, e.g. `09:30`. */
export function formatClockTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Friendly 12-hour label for a `HH:MM` time of day, e.g. `9:00 AM`. */
export function formatTimeOfDayLabel(timeOfDay: string): string {
  if (!isValidTimeOfDay(timeOfDay)) {
    return '—';
  }
  const [hours, minutes] = timeOfDay.split(':').map(Number) as [number, number];
  const period = hours < 12 ? 'AM' : 'PM';
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${pad(minutes)} ${period}`;
}

/** A single entry in a time-of-day picker. */
export interface TimeOfDayOption {
  /** Canonical 24-hour `HH:MM` value used by the domain. */
  readonly value: string;
  /** 12-hour label shown to the user. */
  readonly label: string;
}

/**
 * Every time of day at `stepMinutes` granularity.
 *
 * The step must divide an hour evenly so the list always lands on clean
 * boundaries. Throws a `RangeError` otherwise.
 */
export function buildTimeOfDayOptions(stepMinutes = 15): readonly TimeOfDayOption[] {
  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0 || 60 % stepMinutes !== 0) {
    throw new RangeError(`stepMinutes must be a positive divisor of 60, received ${stepMinutes}`);
  }

  const options: TimeOfDayOption[] = [];
  for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += stepMinutes) {
    const value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    options.push({ value, label: formatTimeOfDayLabel(value) });
  }
  return options;
}

/** e.g. `29 Sep - 5 Oct 2026`. */
export function formatWeekRangeLabel(weekStartKey: string): string {
  if (!isValidDateKey(weekStartKey)) {
    return '—';
  }
  const start = fromDateKey(weekStartKey);
  const end = addDays(start, 6);
  const startLabel = `${start.getDate()} ${MONTH_LABELS[start.getMonth()]}`;
  const endLabel = `${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}`;
  return `${startLabel} - ${endLabel}`;
}

/** `true` when both timestamps fall on the same local calendar day. */
export function isSameLocalDay(aIsoTimestamp: string, bIsoTimestamp: string): boolean {
  return toDateKey(new Date(aIsoTimestamp)) === toDateKey(new Date(bIsoTimestamp));
}
