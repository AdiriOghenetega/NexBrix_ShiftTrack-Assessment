import { create } from 'zustand';

import type { Shift } from '@/core/entities/Shift';
import type { AppError } from '@/core/errors';
import type { Result } from '@/core/result';
import type { CreateShiftRequest } from '@/core/usecases/CreateShift';
import { addDays, fromDateKey, getWeekStartKey, toDateKey, workedDurationMinutes } from '@/core/utils/time';
import { container } from '@/infrastructure/appContainer';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ShiftState {
  readonly weekStartKey: string;
  readonly shifts: Shift[];
  readonly status: LoadStatus;
  readonly error: AppError | null;
  readonly isRefreshing: boolean;

  readonly activeShift: Shift | null;
  readonly activeStatus: LoadStatus;
  readonly activeError: AppError | null;
  readonly isStarting: boolean;
  readonly isEnding: boolean;
  readonly actionError: AppError | null;

  readonly isCreating: boolean;
  readonly createError: AppError | null;
  readonly lastCreatedShift: Shift | null;

  readonly loadWeek: (weekStartKey?: string) => Promise<void>;
  readonly reloadWeek: () => Promise<void>;
  readonly goToPreviousWeek: () => Promise<void>;
  readonly goToNextWeek: () => Promise<void>;
  readonly goToCurrentWeek: () => Promise<void>;
  readonly loadActiveShift: () => Promise<void>;
  readonly createShift: (request: CreateShiftRequest) => Promise<Result<Shift>>;
  readonly startShift: (breakMinutes: number, note?: string | null) => Promise<boolean>;
  readonly endShift: () => Promise<boolean>;
  readonly clearCreateError: () => void;
  readonly clearActionError: () => void;
  readonly reset: () => void;
}

interface InitialSlice {
  readonly weekStartKey: string;
  readonly shifts: Shift[];
  readonly status: LoadStatus;
  readonly error: AppError | null;
  readonly isRefreshing: boolean;
  readonly activeShift: Shift | null;
  readonly activeStatus: LoadStatus;
  readonly activeError: AppError | null;
  readonly isStarting: boolean;
  readonly isEnding: boolean;
  readonly actionError: AppError | null;
  readonly isCreating: boolean;
  readonly createError: AppError | null;
  readonly lastCreatedShift: Shift | null;
}

function initialState(): InitialSlice {
  return {
    weekStartKey: getWeekStartKey(),
    shifts: [],
    status: 'idle',
    error: null,
    isRefreshing: false,
    activeShift: null,
    activeStatus: 'idle',
    activeError: null,
    isStarting: false,
    isEnding: false,
    actionError: null,
    isCreating: false,
    createError: null,
    lastCreatedShift: null,
  };
}

export const useShiftStore = create<ShiftState>()((set, get) => {
  const fetchWeek = async (weekStartKey: string, mode: 'initial' | 'silent'): Promise<void> => {
    if (mode === 'initial') {
      // Clear the previous week's rows: the header switches to the requested
      // week immediately, so keeping stale shifts on screen would label one
      // week's data as another. A background refresh keeps the list instead.
      set({ weekStartKey, shifts: [], status: 'loading', error: null });
    } else {
      set({ weekStartKey, isRefreshing: true });
    }

    const result = await container.getWeeklyShifts.execute({ weekStartDateKey: weekStartKey });

    if (result.ok) {
      set({ shifts: result.value, status: 'ready', error: null, isRefreshing: false });
      return;
    }

    set((state) => ({
      // A failed background refresh keeps the previously loaded data on screen
      // and only surfaces the error, so the list does not flash empty.
      status: mode === 'silent' && state.shifts.length > 0 ? state.status : 'error',
      error: result.error,
      isRefreshing: false,
    }));
  };

  return {
    ...initialState(),

    async loadWeek(weekStartKey) {
      await fetchWeek(weekStartKey ?? get().weekStartKey, 'initial');
    },

    async reloadWeek() {
      await fetchWeek(get().weekStartKey, 'silent');
    },

    async goToPreviousWeek() {
      const previous = toDateKey(addDays(fromDateKey(get().weekStartKey), -7));
      await fetchWeek(previous, 'initial');
    },

    async goToNextWeek() {
      const currentWeekStart = getWeekStartKey();
      const next = toDateKey(addDays(fromDateKey(get().weekStartKey), 7));
      // Never browse into the future beyond the current week.
      if (next > currentWeekStart) {
        return;
      }
      await fetchWeek(next, 'initial');
    },

    async goToCurrentWeek() {
      await fetchWeek(getWeekStartKey(), 'initial');
    },

    async loadActiveShift() {
      set({ activeStatus: 'loading', activeError: null });

      const result = await container.getActiveShift.execute();
      if (result.ok) {
        set({ activeShift: result.value, activeStatus: 'ready', activeError: null });
        return;
      }
      set({ activeStatus: 'error', activeError: result.error });
    },

    async createShift(request) {
      set({ isCreating: true, createError: null });

      const result = await container.createShift.execute(request);
      if (!result.ok) {
        set({ isCreating: false, createError: result.error });
        return result;
      }

      set({ isCreating: false, createError: null, lastCreatedShift: result.value });
      // Instant UI update: re-pull the visible week so the new shift appears.
      await fetchWeek(get().weekStartKey, 'silent');
      return result;
    },

    async startShift(breakMinutes, note) {
      set({ isStarting: true, actionError: null });

      const result = await container.startShift.execute({ breakMinutes, note: note ?? null });
      if (!result.ok) {
        set({ isStarting: false, actionError: result.error });
        return false;
      }

      set({ isStarting: false, activeShift: result.value, activeStatus: 'ready', actionError: null });
      await fetchWeek(get().weekStartKey, 'silent');
      return true;
    },

    async endShift() {
      const active = get().activeShift;
      if (!active) {
        return false;
      }

      set({ isEnding: true, actionError: null });

      const result = await container.endShift.execute({
        shiftId: active.id,
        startTime: active.startTime,
      });
      if (!result.ok) {
        set({ isEnding: false, actionError: result.error });
        return false;
      }

      set({ isEnding: false, activeShift: null, actionError: null });
      await fetchWeek(get().weekStartKey, 'silent');
      return true;
    },

    clearCreateError() {
      set({ createError: null });
    },

    clearActionError() {
      set({ actionError: null });
    },

    reset() {
      set({ ...initialState() });
    },
  };
});

/** Total worked minutes across the loaded week (live for the running shift). */
export function selectWeekWorkedMinutes(state: ShiftState, nowMs: number): number {
  return state.shifts.reduce(
    (total, shift) => total + workedDurationMinutes(shift.startTime, shift.endTime, shift.breakMinutes, nowMs),
    0,
  );
}

export const selectCompletedShiftCount = (state: ShiftState): number =>
  state.shifts.filter((shift) => shift.endTime !== null).length;

export const selectIsCurrentWeek = (state: ShiftState): boolean => state.weekStartKey === getWeekStartKey();
