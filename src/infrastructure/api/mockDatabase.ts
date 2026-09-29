/**
 * In-memory database backing the mock API layer.
 *
 * The seed is generated relative to the current week so the dashboard always
 * looks alive during a demo, and shifts always belong to the signed-in user.
 */

import { addDays, combineDateKeyAndTime, startOfWeek, toDateKey } from '@/core/utils/time';

import type { ShiftDto, UserDto } from './dto';

export interface MockUserRecord extends UserDto {
  readonly password: string;
}

export interface MockDatabaseState {
  readonly users: MockUserRecord[];
  readonly shifts: ShiftDto[];
}

export interface ShiftPatch {
  readonly startTime?: string;
  readonly endTime?: string | null;
  readonly breakMinutes?: number;
  readonly note?: string | null;
}

export interface MockDatabase {
  /** Lists shifts that START inside the requested week. */
  listShiftsForWeek(userId: string, weekStartDateKey: string): ShiftDto[];
  /**
   * The running shift (`endTime === null`) started inside any of the supplied
   * weeks. Scoped to the same window the client searches so that the 409 rule
   * and the client's lookup always agree.
   */
  findActiveShiftInWeeks(userId: string, weekStartDateKeys: readonly string[]): ShiftDto | undefined;
  findShiftById(shiftId: string): ShiftDto | undefined;
  findUserByEmail(email: string): MockUserRecord | undefined;
  findUserById(userId: string): MockUserRecord | undefined;
  insertShift(shift: ShiftDto): ShiftDto;
  patchShift(shiftId: string, patch: ShiftPatch): ShiftDto | undefined;
  /** Removes a shift. Returns `true` when one was actually deleted. */
  deleteShift(shiftId: string): boolean;
  reset(): void;
  /** Total number of stored shifts — handy for the dev panel. */
  countShifts(): number;
}

export const DEMO_CREDENTIALS = {
  email: 'staff@shifttrack.test',
  password: 'Password123',
} as const;

const STAFF_USER_ID = 'usr_staff_001';

export function createMockDatabase(now: Date = new Date()): MockDatabase {
  let state = buildSeedState(now);
  let shiftSequence = 0;

  const nextShiftId = (): string => {
    shiftSequence += 1;
    return `shift_${now.getTime()}_${shiftSequence}`;
  };

  return {
    listShiftsForWeek(userId, weekStartDateKey) {
      const { start, end } = weekBounds(weekStartDateKey);
      return state.shifts
        .filter((shift) => {
          const startedAt = Date.parse(shift.startTime);
          return shift.userId === userId && startedAt >= start && startedAt < end;
        })
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
    },

    findActiveShiftInWeeks(userId, weekStartDateKeys) {
      const windows = weekStartDateKeys.map(weekBounds);
      return state.shifts.find((shift) => {
        if (shift.userId !== userId || shift.endTime !== null) {
          return false;
        }
        const startedAt = Date.parse(shift.startTime);
        return windows.some(({ start, end }) => startedAt >= start && startedAt < end);
      });
    },

    findShiftById(shiftId) {
      return state.shifts.find((shift) => shift.id === shiftId);
    },

    findUserByEmail(email) {
      const normalized = email.trim().toLowerCase();
      return state.users.find((user) => user.email.toLowerCase() === normalized);
    },

    findUserById(userId) {
      return state.users.find((user) => user.id === userId);
    },

    insertShift(shift) {
      const withId: ShiftDto = { ...shift, id: shift.id.length > 0 ? shift.id : nextShiftId() };
      state.shifts.push(withId);
      return withId;
    },

    patchShift(shiftId, patch) {
      const index = state.shifts.findIndex((shift) => shift.id === shiftId);
      const existing = state.shifts[index];
      if (index < 0 || !existing) {
        return undefined;
      }
      const updated: ShiftDto = {
        ...existing,
        startTime: patch.startTime === undefined ? existing.startTime : patch.startTime,
        endTime: patch.endTime === undefined ? existing.endTime : patch.endTime,
        breakMinutes: patch.breakMinutes === undefined ? existing.breakMinutes : patch.breakMinutes,
        note: patch.note === undefined ? existing.note : patch.note,
        updatedAt: new Date().toISOString(),
      };
      state.shifts[index] = updated;
      return updated;
    },

    deleteShift(shiftId) {
      const index = state.shifts.findIndex((shift) => shift.id === shiftId);
      if (index < 0) {
        return false;
      }
      state.shifts.splice(index, 1);
      return true;
    },

    reset() {
      state = buildSeedState(new Date());
      shiftSequence = 0;
    },

    countShifts() {
      return state.shifts.length;
    },
  };
}

function fromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Epoch bounds `[start, end)` of the week beginning `weekStartDateKey`. */
function weekBounds(weekStartDateKey: string): { start: number; end: number } {
  const start = Date.parse(combineDateKeyAndTime(weekStartDateKey, '00:00'));
  const end = Date.parse(combineDateKeyAndTime(toDateKey(addDays(fromKey(weekStartDateKey), 7)), '00:00'));
  return { start, end };
}

interface SeedPlan {
  readonly dayOffset: number;
  readonly start: string;
  readonly end: string;
  readonly breakMinutes: number;
  readonly note: string | null;
}

const WEEK_PLAN: readonly SeedPlan[] = [
  { dayOffset: 0, start: '08:00', end: '16:30', breakMinutes: 30, note: 'Front desk coverage' },
  { dayOffset: 1, start: '09:00', end: '17:00', breakMinutes: 45, note: 'Stocktake' },
  { dayOffset: 2, start: '08:15', end: '12:00', breakMinutes: 0, note: null },
  { dayOffset: 3, start: '10:00', end: '18:15', breakMinutes: 60, note: 'Late shift' },
  { dayOffset: 4, start: '07:30', end: '15:00', breakMinutes: 30, note: null },
];

function buildSeedState(now: Date): MockDatabaseState {
  const users: MockUserRecord[] = [
    {
      id: STAFF_USER_ID,
      email: DEMO_CREDENTIALS.email,
      name: 'Alex Mercer',
      role: 'staff',
      password: DEMO_CREDENTIALS.password,
    },
    {
      id: 'usr_manager_001',
      email: 'manager@shifttrack.test',
      name: 'Priya Raman',
      role: 'manager',
      password: DEMO_CREDENTIALS.password,
    },
  ];

  const weekStart = startOfWeek(now);
  const nowMs = now.getTime();
  const shifts: ShiftDto[] = [];
  let sequence = 0;

  const stamp = (): string => new Date(nowMs - 86_400_000).toISOString();

  const push = (dateKey: string, plan: SeedPlan): void => {
    const startTime = combineDateKeyAndTime(dateKey, plan.start);
    const endTime = combineDateKeyAndTime(dateKey, plan.end);
    if (Date.parse(startTime) > nowMs || Date.parse(endTime) > nowMs) {
      return;
    }
    sequence += 1;
    const createdAt = stamp();
    shifts.push({
      id: `shift_seed_${sequence}`,
      userId: STAFF_USER_ID,
      startTime,
      endTime,
      breakMinutes: plan.breakMinutes,
      note: plan.note,
      createdAt,
      updatedAt: createdAt,
    });
  };

  for (const plan of WEEK_PLAN) {
    const day = addDays(weekStart, plan.dayOffset);
    push(toDateKey(day), plan);
  }

  if (shifts.length === 0) {
    // Early Monday (or a fresh install mid-week): fall back to last week's
    // Friday so the dashboard never renders an artificial empty state.
    const friday = addDays(weekStart, -3);
    const startTime = combineDateKeyAndTime(toDateKey(friday), '08:00');
    const endTime = combineDateKeyAndTime(toDateKey(friday), '16:00');
    const createdAt = stamp();
    shifts.push({
      id: 'shift_seed_prev_week',
      userId: STAFF_USER_ID,
      startTime,
      endTime,
      breakMinutes: 30,
      note: 'Previous week',
      createdAt,
      updatedAt: createdAt,
    });
  }

  return { users, shifts };
}
