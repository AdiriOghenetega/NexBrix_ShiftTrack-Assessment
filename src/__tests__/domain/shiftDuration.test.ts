import { sumShiftMinutes, type Shift } from '@/core/entities/Shift';
import {
  combineDateKeyAndTime,
  elapsedMsSince,
  formatMinutesAsDuration,
  formatTimer,
  formatWeekRangeLabel,
  fromDateKey,
  getWeekEndKey,
  getWeekStartKey,
  grossDurationMs,
  isValidDateKey,
  isValidTimeOfDay,
  startOfWeek,
  toDateKey,
  toDecimalHours,
  toEpochMs,
  workedDurationMinutes,
  workedDurationMs,
} from '@/core/utils/time';

const DATE = '2026-09-29'; // a Tuesday

const at = (time: string): string => combineDateKeyAndTime(DATE, time);

describe('shift duration calculation', () => {
  it('subtracts the unpaid break from the gross duration', () => {
    const start = at('09:00');
    const end = at('17:30');

    // 8h30m gross - 30m break = 8h = 480 minutes
    expect(workedDurationMinutes(start, end, 30, toEpochMs(end))).toBe(480);
  });

  it('returns the gross duration when there is no break', () => {
    const start = at('09:00');
    const end = at('12:15');
    expect(workedDurationMinutes(start, end, 0, toEpochMs(end))).toBe(195);
  });

  it('never returns a negative duration when the break exceeds the shift', () => {
    const start = at('09:00');
    const end = at('10:00');
    expect(workedDurationMs(start, end, 600, toEpochMs(end))).toBe(0);
    expect(workedDurationMinutes(start, end, 600, toEpochMs(end))).toBe(0);
  });

  it('measures a running shift against "now" instead of an end time', () => {
    const start = at('09:00');
    const now = toEpochMs(start) + 90 * 60_000;
    expect(workedDurationMinutes(start, null, 0, now)).toBe(90);
  });

  it('clamps a reversed range to zero', () => {
    const start = at('17:00');
    const end = at('09:00');
    expect(grossDurationMs(start, end)).toBe(0);
  });

  it('rounds to the nearest minute for display totals', () => {
    const start = at('09:00');
    const end = new Date(toEpochMs(start) + 90_500).toISOString();
    expect(workedDurationMinutes(start, end, 0, toEpochMs(end))).toBe(2);
  });

  it('sums worked minutes across a collection of shifts', () => {
    const shift = (id: string, start: string, end: string, breakMinutes: number): Shift => ({
      id,
      userId: 'usr_1',
      startTime: at(start),
      endTime: at(end),
      breakMinutes,
      note: null,
      createdAt: at(start),
      updatedAt: at(end),
    });

    const shifts = [
      shift('a', '08:00', '12:00', 0), // 240
      shift('b', '13:00', '17:00', 30), // 210
    ];

    expect(sumShiftMinutes(shifts, Date.now())).toBe(450);
  });
});

describe('duration formatting', () => {
  it('formats a duration as HH:MM:SS and pads every part', () => {
    expect(formatTimer(0)).toBe('00:00:00');
    expect(formatTimer(1_000)).toBe('00:00:01');
    expect(formatTimer(61_000)).toBe('00:01:01');
    expect(formatTimer(3_661_000)).toBe('01:01:01');
  });

  it('keeps counting past 24 hours instead of wrapping', () => {
    expect(formatTimer(100 * 3_600_000)).toBe('100:00:00');
  });

  it('clamps negative durations', () => {
    expect(formatTimer(-5_000)).toBe('00:00:00');
  });

  it('formats minutes as a compact human label', () => {
    expect(formatMinutesAsDuration(0)).toBe('0m');
    expect(formatMinutesAsDuration(45)).toBe('45m');
    expect(formatMinutesAsDuration(60)).toBe('1h');
    expect(formatMinutesAsDuration(450)).toBe('7h 30m');
  });

  it('converts minutes to decimal hours', () => {
    expect(toDecimalHours(450)).toBe(7.5);
    expect(toDecimalHours(0)).toBe(0);
    expect(toDecimalHours(485)).toBe(8.08);
  });
});

describe('week + date helpers', () => {
  it('starts the week on Monday', () => {
    const tuesday = new Date(2026, 8, 29);
    expect(getWeekStartKey(tuesday)).toBe('2026-09-28');
    expect(getWeekEndKey(tuesday)).toBe('2026-10-04');
  });

  it('treats Monday as the start of its own week', () => {
    const monday = new Date(2026, 8, 28);
    expect(getWeekStartKey(monday)).toBe('2026-09-28');
  });

  it('handles the Sunday of that week', () => {
    const sunday = new Date(2026, 9, 4);
    expect(getWeekStartKey(sunday)).toBe('2026-09-28');
  });

  it('round-trips a date key through fromDateKey/toDateKey', () => {
    expect(toDateKey(fromDateKey('2026-03-01'))).toBe('2026-03-01');
  });

  it('returns local midnight for a date key', () => {
    const date = fromDateKey('2026-09-29');
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getDate()).toBe(29);
  });

  it('normalises a mid-week date to its Monday at midnight', () => {
    const thursday = new Date(2026, 9, 1, 15, 45, 30);
    const monday = startOfWeek(thursday);
    expect(toDateKey(monday)).toBe('2026-09-28');
    expect(monday.getHours()).toBe(0);
  });

  it('labels the week range for the UI', () => {
    expect(formatWeekRangeLabel('2026-09-28')).toBe('28 Sep - 4 Oct 2026');
  });

  it('validates date keys strictly (rejects impossible days)', () => {
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('26-01-01')).toBe(false);
    expect(isValidDateKey('')).toBe(false);
  });

  it('validates 24-hour times strictly', () => {
    expect(isValidTimeOfDay('00:00')).toBe(true);
    expect(isValidTimeOfDay('23:59')).toBe(true);
    expect(isValidTimeOfDay('24:00')).toBe(false);
    expect(isValidTimeOfDay('9:00')).toBe(false);
    expect(isValidTimeOfDay('09:60')).toBe(false);
  });

  it('throws on malformed input instead of silently producing NaN', () => {
    expect(() => combineDateKeyAndTime('29/09/2026', '09:00')).toThrow(RangeError);
    expect(() => combineDateKeyAndTime('2026-09-29', '9am')).toThrow(RangeError);
    expect(() => toEpochMs('not-a-date')).toThrow(RangeError);
  });

  it('produces timestamps that are timezone-independent in their difference', () => {
    const start = at('23:30');
    const end = combineDateKeyAndTime('2026-09-30', '00:30');
    expect(toEpochMs(end) - toEpochMs(start)).toBe(60 * 60_000);
  });
});

describe('elapsed time is derived from absolute timestamps', () => {
  it('computes elapsed milliseconds from the start timestamp', () => {
    const start = at('09:00');
    const startMs = toEpochMs(start);
    expect(elapsedMsSince(start, startMs + 5 * 60_000)).toBe(5 * 60_000);
  });
});
