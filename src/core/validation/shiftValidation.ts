/**
 * Shift form validation.
 *
 * Kept as pure functions (no React, no UI) so the same rules are enforced by
 * the form, the use cases and the unit tests.
 */

import { isValidDateKey, isValidTimeOfDay, toEpochMs } from '../utils/time';

export const MAX_BREAK_MINUTES = 12 * 60;

export const REQUIRED_DATE_MESSAGE = 'Pick a date for the shift.';
export const INVALID_DATE_MESSAGE = 'Use the format YYYY-MM-DD.';
export const REQUIRED_START_MESSAGE = 'Start time is required.';
export const REQUIRED_END_MESSAGE = 'End time is required.';
export const INVALID_TIME_MESSAGE = 'Use 24-hour time, for example 09:30 or 17:45.';
export const END_BEFORE_START_MESSAGE = 'End time must be after start time.';
export const INVALID_BREAK_MESSAGE = 'Break must be a whole number of minutes.';
export const NEGATIVE_BREAK_MESSAGE = 'Break cannot be negative.';
export const BREAK_TOO_LONG_MESSAGE = `Break cannot exceed ${MAX_BREAK_MINUTES} minutes.`;
export const NOTE_TOO_LONG_MESSAGE = 'Note must be 280 characters or fewer.';

export const MAX_NOTE_LENGTH = 280;

export interface CreateShiftFormValues {
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly breakMinutes: string;
  readonly note: string;
}

export type ShiftFormField = 'date' | 'startTime' | 'endTime' | 'breakMinutes' | 'note';

export type ShiftFormErrors = Partial<Record<ShiftFormField, string>>;

export interface ShiftFormValidation {
  readonly valid: boolean;
  readonly errors: ShiftFormErrors;
}

export const emptyCreateShiftForm = (today: string): CreateShiftFormValues => ({
  date: today,
  startTime: '',
  endTime: '',
  breakMinutes: '0',
  note: '',
});

/**
 * Returns an error message when the end timestamp is not strictly after the
 * start timestamp. `null` end (still-running shift) is always valid.
 */
export function getShiftRangeError(startIsoTimestamp: string, endIsoTimestamp: string | null): string | null {
  if (endIsoTimestamp === null) {
    return null;
  }
  try {
    if (toEpochMs(endIsoTimestamp) <= toEpochMs(startIsoTimestamp)) {
      return END_BEFORE_START_MESSAGE;
    }
  } catch {
    return INVALID_TIME_MESSAGE;
  }
  return null;
}

/** Validates the unpaid break duration in minutes. */
export function getBreakMinutesError(breakMinutes: number): string | null {
  if (!Number.isFinite(breakMinutes) || !Number.isInteger(breakMinutes)) {
    return INVALID_BREAK_MESSAGE;
  }
  if (breakMinutes < 0) {
    return NEGATIVE_BREAK_MESSAGE;
  }
  if (breakMinutes > MAX_BREAK_MINUTES) {
    return BREAK_TOO_LONG_MESSAGE;
  }
  return null;
}

/** Validates the whole create-shift form and returns per-field messages. */
export function validateCreateShiftForm(values: CreateShiftFormValues): ShiftFormValidation {
  const errors: ShiftFormErrors = {};

  const date = values.date.trim();
  if (!date) {
    errors.date = REQUIRED_DATE_MESSAGE;
  } else if (!isValidDateKey(date)) {
    errors.date = INVALID_DATE_MESSAGE;
  }

  const startTime = values.startTime.trim();
  if (!startTime) {
    errors.startTime = REQUIRED_START_MESSAGE;
  } else if (!isValidTimeOfDay(startTime)) {
    errors.startTime = INVALID_TIME_MESSAGE;
  }

  const endTime = values.endTime.trim();
  if (!endTime) {
    errors.endTime = REQUIRED_END_MESSAGE;
  } else if (!isValidTimeOfDay(endTime)) {
    errors.endTime = INVALID_TIME_MESSAGE;
  }

  const breakRaw = values.breakMinutes.trim();
  if (breakRaw.length === 0) {
    errors.breakMinutes = INVALID_BREAK_MESSAGE;
  } else {
    const breakValue = Number(breakRaw);
    const breakError = Number.isNaN(breakValue) ? INVALID_BREAK_MESSAGE : getBreakMinutesError(breakValue);
    if (breakError) {
      errors.breakMinutes = breakError;
    }
  }

  if (values.note.length > MAX_NOTE_LENGTH) {
    errors.note = NOTE_TOO_LONG_MESSAGE;
  }

  // Cross-field rules only run once both times are individually well formed.
  if (!errors.startTime && !errors.endTime && !errors.date) {
    const startIso = combineToIso(date, startTime);
    const endIso = combineToIso(date, endTime);
    const rangeError = getShiftRangeError(startIso, endIso);
    if (rangeError) {
      errors.endTime = rangeError;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function combineToIso(dateKey: string, timeOfDay: string): string {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  const [hours, minutes] = timeOfDay.split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

/** Simple email shape check shared by the login form and use case. */
export function getEmailError(email: string): string | null {
  const value = email.trim();
  if (!value) {
    return 'Email is required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function getPasswordError(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}
