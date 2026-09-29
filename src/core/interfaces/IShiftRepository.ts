import type { CreateShiftInput, Shift, UpdateShiftInput } from '../entities/Shift';

/** Port: shift data source. */
export interface IShiftRepository {
  /** Shifts whose start falls inside the week beginning `weekStartDateKey`. */
  getShiftsByWeek(weekStartDateKey: string): Promise<Shift[]>;
  /** The currently running shift (`endTime === null`), if any. */
  getActiveShift(): Promise<Shift | null>;
  /** A single shift by id. Rejects with a `NOT_FOUND` `AppError` when absent. */
  getShiftById(shiftId: string): Promise<Shift>;
  createShift(input: CreateShiftInput): Promise<Shift>;
  updateShift(shiftId: string, input: UpdateShiftInput): Promise<Shift>;
  /** Permanently removes a shift. */
  deleteShift(shiftId: string): Promise<void>;
}
