import type { Shift } from '../entities/Shift';
import { AppError, toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';
import { getShiftRangeError } from '../validation/shiftValidation';

export interface EndShiftRequest {
  readonly shiftId: string;
  readonly startTime?: string;
  /** Explicit end instant; defaults to "now". */
  readonly endTime?: string;
  readonly now?: Date;
}

/**
 * Ends a running shift by patching `endTime`.
 *
 * When the caller knows the shift start we also re-check the ordering rule so
 * a zero/negative duration can never be persisted.
 */
export class EndShift {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(request: EndShiftRequest): Promise<Result<Shift>> {
    const shiftId = request.shiftId.trim();
    if (!shiftId) {
      return fail(new AppError('VALIDATION', 'A shift id is required to end a shift.'));
    }

    const endTime = request.endTime ?? (request.now ?? new Date()).toISOString();

    if (request.startTime) {
      const rangeError = getShiftRangeError(request.startTime, endTime);
      if (rangeError) {
        return fail(new AppError('VALIDATION', rangeError, { fieldErrors: { endTime: rangeError } }));
      }
    }

    try {
      return ok(await this.shiftRepository.updateShift(shiftId, { endTime }));
    } catch (error) {
      return fail(toAppError(error, 'Unable to end the shift.'));
    }
  }
}
