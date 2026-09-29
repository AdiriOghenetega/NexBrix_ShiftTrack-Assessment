import type { CreateShiftInput, Shift } from '../entities/Shift';
import { AppError, toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';
import { getBreakMinutesError, getShiftRangeError } from '../validation/shiftValidation';

/** A completed-shift creation request: both bounds are required. */
export interface CreateShiftRequest {
  readonly startTime: string;
  readonly endTime: string;
  readonly breakMinutes: number;
  readonly note?: string | null;
}

/**
 * Business rules for creating a shift:
 *  - the end time must be strictly after the start time;
 *  - the unpaid break must be a whole number of minutes within range.
 */
export class CreateShift {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(request: CreateShiftRequest): Promise<Result<Shift>> {
    const rangeError = getShiftRangeError(request.startTime, request.endTime);
    if (rangeError) {
      return fail(new AppError('VALIDATION', rangeError, { fieldErrors: { endTime: rangeError } }));
    }

    const breakError = getBreakMinutesError(request.breakMinutes);
    if (breakError) {
      return fail(new AppError('VALIDATION', breakError, { fieldErrors: { breakMinutes: breakError } }));
    }

    const input: CreateShiftInput = {
      startTime: request.startTime,
      endTime: request.endTime,
      breakMinutes: request.breakMinutes,
      note: normalizeNote(request.note),
    };

    try {
      return ok(await this.shiftRepository.createShift(input));
    } catch (error) {
      return fail(toAppError(error, 'Unable to create the shift.'));
    }
  }
}

export function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
