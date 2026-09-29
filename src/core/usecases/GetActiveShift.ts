import type { Shift } from '../entities/Shift';
import { toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';

/** Returns the running shift (`endTime === null`) or `null`. */
export class GetActiveShift {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(): Promise<Result<Shift | null>> {
    try {
      return ok(await this.shiftRepository.getActiveShift());
    } catch (error) {
      return fail(toAppError(error, 'Unable to check for an active shift.'));
    }
  }
}
