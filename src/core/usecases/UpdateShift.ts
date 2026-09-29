import type { Shift } from '../entities/Shift';
import { AppError, toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';
import { getBreakMinutesError, getShiftRangeError } from '../validation/shiftValidation';
import { normalizeNote } from './CreateShift';

/** A full edit of an existing shift: both bounds are required. */
export interface UpdateShiftRequest {
  readonly shiftId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly breakMinutes: number;
  readonly note?: string | null;
}

/**
 * Business rules for editing a shift — identical to creation, so the same
 * helpers enforce them: the end time must be strictly after the start time and
 * the unpaid break must be a whole number of minutes within range.
 */
export class UpdateShift {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(request: UpdateShiftRequest): Promise<Result<Shift>> {
    const shiftId = request.shiftId.trim();
    if (!shiftId) {
      return fail(new AppError('VALIDATION', 'A shift id is required to update a shift.'));
    }

    const rangeError = getShiftRangeError(request.startTime, request.endTime);
    if (rangeError) {
      return fail(new AppError('VALIDATION', rangeError, { fieldErrors: { endTime: rangeError } }));
    }

    const breakError = getBreakMinutesError(request.breakMinutes);
    if (breakError) {
      return fail(new AppError('VALIDATION', breakError, { fieldErrors: { breakMinutes: breakError } }));
    }

    try {
      return ok(
        await this.shiftRepository.updateShift(shiftId, {
          startTime: request.startTime,
          endTime: request.endTime,
          breakMinutes: request.breakMinutes,
          note: normalizeNote(request.note),
        }),
      );
    } catch (error) {
      return fail(toAppError(error, 'Unable to save the shift.'));
    }
  }
}
