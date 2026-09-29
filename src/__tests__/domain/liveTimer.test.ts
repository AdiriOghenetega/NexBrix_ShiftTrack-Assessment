/**
 * Live timer behaviour.
 *
 * The critical requirement is that the timer must survive backgrounding,
 * closing and reopening the app. That is only true if the elapsed value is
 * recomputed from the absolute start timestamp on every read — which is what
 * `elapsedMsSince` does — rather than accumulated from interval ticks.
 */

import { combineDateKeyAndTime, elapsedMsSince, elapsedSecondsSince, formatTimer, toEpochMs } from '@/core/utils/time';

const START = combineDateKeyAndTime('2026-09-29', '09:00');
const START_MS = toEpochMs(START);

describe('live timer accuracy', () => {
  it('reports zero right at the start of the shift', () => {
    expect(elapsedMsSince(START, START_MS)).toBe(0);
    expect(formatTimer(elapsedMsSince(START, START_MS))).toBe('00:00:00');
  });

  it('advances one second per second while foregrounded', () => {
    expect(formatTimer(elapsedMsSince(START, START_MS + 1_000))).toBe('00:00:01');
    expect(formatTimer(elapsedMsSince(START, START_MS + 59_000))).toBe('00:00:59');
    expect(formatTimer(elapsedMsSince(START, START_MS + 60_000))).toBe('00:01:00');
    expect(formatTimer(elapsedMsSince(START, START_MS + 3_600_000))).toBe('01:00:00');
  });

  it('shows the correct time after the app is backgrounded for hours', () => {
    // The app is suspended for 2h; the next read jumps straight to 02:05:00
    // instead of resuming from the last rendered value.
    const beforeSuspend = elapsedMsSince(START, START_MS + 5 * 60_000);
    const afterResume = elapsedMsSince(START, START_MS + 125 * 60_000);

    expect(formatTimer(beforeSuspend)).toBe('00:05:00');
    expect(formatTimer(afterResume)).toBe('02:05:00');
  });

  it('matches a wall-clock read taken after the app was killed and reopened', () => {
    const killedAt = START_MS + 10 * 60_000;
    const reopenedAt = START_MS + 7 * 3_600_000 + 42 * 60_000 + 15_000;

    const elapsedBeforeKill = elapsedMsSince(START, killedAt);
    const elapsedAfterReopen = elapsedMsSince(START, reopenedAt);

    expect(formatTimer(elapsedBeforeKill)).toBe('00:10:00');
    expect(formatTimer(elapsedAfterReopen)).toBe('07:42:15');
    // Recomputing is idempotent: the same "now" always yields the same value.
    expect(elapsedMsSince(START, reopenedAt)).toBe(elapsedAfterReopen);
  });

  it('is monotonic across a sequence of irregular ticks', () => {
    const offsets = [0, 1_000, 2_000, 900_000, 900_001, 3_600_000];
    const values = offsets.map((offset) => elapsedMsSince(START, START_MS + offset));

    expect(values).toEqual([0, 1_000, 2_000, 900_000, 900_001, 3_600_000]);
    expect(values).toStrictEqual([...values].sort((a, b) => a - b));
  });

  it('does not drift when ticks are dropped (accumulator comparison)', () => {
    // A naive `elapsed += 1000` accumulator that missed 10 ticks in the
    // background would report 20s; the timestamp-derived value reports 30s.
    const nowMs = START_MS + 30_000;
    const accumulatorAfterDroppedTicks = 20_000;
    const timestampDerived = elapsedMsSince(START, nowMs);

    expect(timestampDerived).toBe(30_000);
    expect(timestampDerived).not.toBe(accumulatorAfterDroppedTicks);
  });

  it('clamps to zero when the device clock moves backwards', () => {
    expect(elapsedMsSince(START, START_MS - 60_000)).toBe(0);
  });

  it('exposes whole elapsed seconds for coarse rendering', () => {
    expect(elapsedSecondsSince(START, START_MS + 1_999)).toBe(1);
    expect(elapsedSecondsSince(START, START_MS + 2_000)).toBe(2);
  });
});
