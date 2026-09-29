import type { Shift } from '../entities/Shift';
import { AppError, toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';

export interface GetShiftByIdRequest {
  readonly shiftId: string;
}

/** Loads a single shift, used by the edit screen. */
export class GetShiftById {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(request: GetShiftByIdRequest): Promise<Result<Shift>> {
    const shiftId = request.shiftId.trim();
    if (!shiftId) {
      return fail(new AppError('VALIDATION', 'A shift id is required.'));
    }

    try {
      return ok(await this.shiftRepository.getShiftById(shiftId));
    } catch (error) {
      return fail(toAppError(error, 'Unable to load that shift.'));
    }
  }
}
