import { compareShiftsChronologically, type Shift } from '../entities/Shift';
import { AppError, toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';
import { isValidDateKey } from '../utils/time';

export interface GetWeeklyShiftsRequest {
  /** Local `YYYY-MM-DD` key of the Monday that starts the week. */
  readonly weekStartDateKey: string;
}

/** Loads the current week of shifts, ordered chronologically. */
export class GetWeeklyShifts {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(request: GetWeeklyShiftsRequest): Promise<Result<Shift[]>> {
    if (!isValidDateKey(request.weekStartDateKey)) {
      return fail(new AppError('VALIDATION', 'A valid week start date is required.'));
    }

    try {
      const shifts = await this.shiftRepository.getShiftsByWeek(request.weekStartDateKey);
      return ok([...shifts].sort(compareShiftsChronologically));
    } catch (error) {
      return fail(toAppError(error, 'Unable to load your shifts.'));
    }
  }
}
