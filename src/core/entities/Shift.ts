/**
 * Shift domain entity.
 *
 * Pure data + pure predicates. No network, storage or UI concerns leak in
 * here — repositories are responsible for mapping transport payloads into
 * this shape.
 */

export interface Shift {
  readonly id: string;
  readonly userId: string;
  /** ISO-8601 timestamp of the shift start. */
  readonly startTime: string;
  /** ISO-8601 timestamp of the shift end, or `null` while the shift runs. */
  readonly endTime: string | null;
  /** Unpaid break in whole minutes. */
  readonly breakMinutes: number;
  readonly note: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Input accepted by `IShiftRepository.createShift`. */
export interface CreateShiftInput {
  readonly startTime: string;
  readonly endTime: string | null;
  readonly breakMinutes: number;
  readonly note?: string | null;
}

/** Input accepted by `IShiftRepository.updateShift` (partial patch). */
export interface UpdateShiftInput {
  readonly startTime?: string;
  readonly endTime?: string | null;
  readonly breakMinutes?: number;
  readonly note?: string | null;
}

/** A shift that has been started but not yet ended. */
export function isShiftActive(shift: Shift): boolean {
  return shift.endTime === null;
}

/** Type guard narrowing a shift to its active (still-running) variant. */
export interface ActiveShift extends Shift {
  readonly endTime: null;
}

export function isActiveShift(shift: Shift): shift is ActiveShift {
  return shift.endTime === null;
}

/** Chronological comparator (earliest start first). */
export function compareShiftsChronologically(a: Shift, b: Shift): number {
  return Date.parse(a.startTime) - Date.parse(b.startTime);
}

/** Sum of worked minutes across a collection of shifts. */
export function sumShiftMinutes(shifts: readonly Shift[], nowMs: number): number {
  return shifts.reduce((total, shift) => {
    const end = shift.endTime === null ? nowMs : Date.parse(shift.endTime);
    const gross = Math.max(0, end - Date.parse(shift.startTime));
    return total + Math.max(0, Math.round(gross / 60_000) - shift.breakMinutes);
  }, 0);
}
