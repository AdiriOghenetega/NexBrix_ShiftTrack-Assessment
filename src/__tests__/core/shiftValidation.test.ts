import {
  BREAK_TOO_LONG_MESSAGE,
  END_BEFORE_START_MESSAGE,
  INVALID_BREAK_MESSAGE,
  INVALID_DATE_MESSAGE,
  INVALID_TIME_MESSAGE,
  MAX_BREAK_MINUTES,
  NOTE_TOO_LONG_MESSAGE,
  NEGATIVE_BREAK_MESSAGE,
  REQUIRED_END_MESSAGE,
  REQUIRED_START_MESSAGE,
  getBreakMinutesError,
  getEmailError,
  getPasswordError,
  getShiftRangeError,
  validateCreateShiftForm,
  type CreateShiftFormValues,
} from '@/core/validation/shiftValidation';
import { combineDateKeyAndTime } from '@/core/utils/time';

const validForm: CreateShiftFormValues = {
  date: '2026-09-29',
  startTime: '09:00',
  endTime: '17:00',
  breakMinutes: '30',
  note: '',
};

const withValues = (overrides: Partial<CreateShiftFormValues>): CreateShiftFormValues => ({
  ...validForm,
  ...overrides,
});

describe('create shift form validation', () => {
  it('accepts a well formed shift', () => {
    const result = validateCreateShiftForm(validForm);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('rejects an end time that is before the start time', () => {
    const result = validateCreateShiftForm(withValues({ endTime: '08:59' }));
    expect(result.valid).toBe(false);
    expect(result.errors.endTime).toBe(END_BEFORE_START_MESSAGE);
  });

  it('rejects an end time equal to the start time', () => {
    const result = validateCreateShiftForm(withValues({ endTime: '09:00' }));
    expect(result.valid).toBe(false);
    expect(result.errors.endTime).toBe(END_BEFORE_START_MESSAGE);
  });

  it('accepts an end time one minute after the start time', () => {
    const result = validateCreateShiftForm(withValues({ startTime: '09:00', endTime: '09:01' }));
    expect(result.valid).toBe(true);
  });

  it('requires both times', () => {
    const missingStart = validateCreateShiftForm(withValues({ startTime: '' }));
    expect(missingStart.errors.startTime).toBe(REQUIRED_START_MESSAGE);

    const missingEnd = validateCreateShiftForm(withValues({ endTime: '' }));
    expect(missingEnd.errors.endTime).toBe(REQUIRED_END_MESSAGE);
  });

  it('reports malformed times', () => {
    const result = validateCreateShiftForm(withValues({ startTime: '9:00', endTime: '25:00' }));
    expect(result.errors.startTime).toBe(INVALID_TIME_MESSAGE);
    expect(result.errors.endTime).toBe(INVALID_TIME_MESSAGE);
  });

  it('does not run cross-field checks while a time is malformed', () => {
    const result = validateCreateShiftForm(withValues({ startTime: 'bogus', endTime: '17:00' }));
    // The malformed start is reported once, not shadowed by a range error.
    expect(result.errors.startTime).toBe(INVALID_TIME_MESSAGE);
    expect(result.errors.endTime).toBeUndefined();
  });

  it('reports an invalid calendar date', () => {
    const result = validateCreateShiftForm(withValues({ date: '2026-02-30' }));
    expect(result.errors.date).toBe(INVALID_DATE_MESSAGE);
  });

  it('rejects negative and non-numeric breaks', () => {
    expect(validateCreateShiftForm(withValues({ breakMinutes: '-15' })).errors.breakMinutes).toBe(
      NEGATIVE_BREAK_MESSAGE,
    );
    expect(validateCreateShiftForm(withValues({ breakMinutes: 'abc' })).errors.breakMinutes).toBe(
      INVALID_BREAK_MESSAGE,
    );
    expect(validateCreateShiftForm(withValues({ breakMinutes: '' })).errors.breakMinutes).toBe(
      INVALID_BREAK_MESSAGE,
    );
    expect(validateCreateShiftForm(withValues({ breakMinutes: '7.5' })).errors.breakMinutes).toBe(
      INVALID_BREAK_MESSAGE,
    );
  });

  it('caps the unpaid break', () => {
    expect(getBreakMinutesError(MAX_BREAK_MINUTES)).toBeNull();
    expect(getBreakMinutesError(MAX_BREAK_MINUTES + 1)).toBe(BREAK_TOO_LONG_MESSAGE);
  });

  it('limits the note length', () => {
    const result = validateCreateShiftForm(withValues({ note: 'x'.repeat(281) }));
    expect(result.errors.note).toBe(NOTE_TOO_LONG_MESSAGE);
  });

  it('ignores surrounding whitespace', () => {
    const result = validateCreateShiftForm(
      withValues({ date: ' 2026-09-29 ', startTime: ' 09:00 ', endTime: ' 17:00 ', breakMinutes: ' 30 ' }),
    );
    expect(result.valid).toBe(true);
  });
});

describe('shift range validation used by the use case', () => {
  const start = combineDateKeyAndTime('2026-09-29', '09:00');
  const end = combineDateKeyAndTime('2026-09-29', '17:00');

  it('accepts a valid range', () => {
    expect(getShiftRangeError(start, end)).toBeNull();
  });

  it('rejects a reversed range', () => {
    expect(getShiftRangeError(end, start)).toBe(END_BEFORE_START_MESSAGE);
  });

  it('treats a null end (running shift) as valid', () => {
    expect(getShiftRangeError(start, null)).toBeNull();
  });
});

describe('login field validation', () => {
  it('validates the email shape', () => {
    expect(getEmailError('staff@shifttrack.test')).toBeNull();
    expect(getEmailError('')).toBe('Email is required.');
    expect(getEmailError('staff@')).toBe('Enter a valid email address.');
    expect(getEmailError('staff at work')).toBe('Enter a valid email address.');
  });

  it('validates the password', () => {
    expect(getPasswordError('Password123')).toBeNull();
    expect(getPasswordError('')).toBe('Password is required.');
    expect(getPasswordError('123')).toBe('Password must be at least 6 characters.');
  });
});
