import { AppError, toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';

export interface DeleteShiftRequest {
  readonly shiftId: string;
}

/** Permanently removes a shift. */
export class DeleteShift {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(request: DeleteShiftRequest): Promise<Result<void>> {
    const shiftId = request.shiftId.trim();
    if (!shiftId) {
      return fail(new AppError('VALIDATION', 'A shift id is required to delete a shift.'));
    }

    try {
      await this.shiftRepository.deleteShift(shiftId);
      return ok(undefined);
    } catch (error) {
      return fail(toAppError(error, 'Unable to delete the shift.'));
    }
  }
}
