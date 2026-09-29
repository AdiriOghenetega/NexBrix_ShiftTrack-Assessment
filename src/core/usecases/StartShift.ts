import type { Shift } from '../entities/Shift';
import { AppError, toAppError } from '../errors';
import type { IShiftRepository } from '../interfaces/IShiftRepository';
import { fail, ok, type Result } from '../result';
import { getBreakMinutesError } from '../validation/shiftValidation';
import { normalizeNote } from './CreateShift';

export interface StartShiftRequest {
  readonly breakMinutes?: number;
  readonly note?: string | null;
  /** Injectable clock so the behaviour is deterministic in tests. */
  readonly now?: Date;
}

/**
 * Starts an open shift (`endTime === null`).
 *
 * Only one shift may be running at a time, and the start timestamp is captured
 * as an absolute ISO instant so the live timer can be recomputed from it after
 * the app has been backgrounded or relaunched.
 */
export class StartShift {
  constructor(private readonly shiftRepository: IShiftRepository) {}

  async execute(request: StartShiftRequest = {}): Promise<Result<Shift>> {
    const breakMinutes = request.breakMinutes ?? 0;
    const breakError = getBreakMinutesError(breakMinutes);
    if (breakError) {
      return fail(new AppError('VALIDATION', breakError, { fieldErrors: { breakMinutes: breakError } }));
    }

    try {
      const running = await this.shiftRepository.getActiveShift();
      if (running) {
        return fail(
          new AppError('CONFLICT', 'A shift is already running. End it before starting a new one.'),
        );
      }

      const now = request.now ?? new Date();
      const shift = await this.shiftRepository.createShift({
        startTime: now.toISOString(),
        endTime: null,
        breakMinutes,
        note: normalizeNote(request.note),
      });
      return ok(shift);
    } catch (error) {
      return fail(toAppError(error, 'Unable to start the shift.'));
    }
  }
}
