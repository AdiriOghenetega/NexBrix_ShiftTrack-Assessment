import { create } from 'zustand';

import type { Shift } from '@/core/entities/Shift';
import { AppError } from '@/core/errors';
import { fail, type Result } from '@/core/result';
import type { UpdateShiftRequest } from '@/core/usecases/UpdateShift';
import { container } from '@/infrastructure/appContainer';

import { useShiftStore } from './useShiftStore';

export type ShiftEditorStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ShiftEditorState {
  readonly shiftId: string | null;
  readonly shift: Shift | null;
  readonly status: ShiftEditorStatus;
  readonly loadError: AppError | null;
  readonly isSaving: boolean;
  readonly isDeleting: boolean;
  /** Failure from the last save/delete, surfaced in the form or a banner. */
  readonly formError: AppError | null;
  readonly loadShift: (shiftId: string) => Promise<void>;
  readonly saveShift: (request: Omit<UpdateShiftRequest, 'shiftId'>) => Promise<Result<Shift>>;
  readonly removeShift: () => Promise<boolean>;
  readonly clearFormError: () => void;
  readonly reset: () => void;
}

/**
 * State for the edit-shift screen.
 *
 * Kept separate from `useShiftStore` so the weekly dashboard's concerns (the
 * loaded week, the active shift) stay independent of a single record's edit
 * session. Mutations refresh the week through the other store, exactly as the
 * auth store already resets it on sign-out.
 */
export const useShiftEditorStore = create<ShiftEditorState>()((set, get) => ({
  shiftId: null,
  shift: null,
  status: 'idle',
  loadError: null,
  isSaving: false,
  isDeleting: false,
  formError: null,

  async loadShift(shiftId) {
    set({ shiftId, status: 'loading', loadError: null, formError: null });

    const result = await container.getShiftById.execute({ shiftId });
    if (!result.ok) {
      set({ status: 'error', loadError: result.error, shift: null });
      return;
    }

    set({ status: 'ready', shift: result.value, loadError: null });
  },

  async saveShift(request) {
    const shiftId = get().shiftId;
    if (!shiftId) {
      return fail<Shift>(new AppError('VALIDATION', 'No shift is being edited.'));
    }

    set({ isSaving: true, formError: null });

    const result = await container.updateShift.execute({ shiftId, ...request });
    if (!result.ok) {
      set({ isSaving: false, formError: result.error });
      return result;
    }

    set({ isSaving: false, shift: result.value, formError: null });
    // Keep the week the user came from in step with the change.
    await useShiftStore.getState().reloadWeek();
    return result;
  },

  async removeShift() {
    const shiftId = get().shiftId;
    if (!shiftId) {
      return false;
    }

    set({ isDeleting: true, formError: null });

    const result = await container.deleteShift.execute({ shiftId });
    if (!result.ok) {
      set({ isDeleting: false, formError: result.error });
      return false;
    }

    set({ isDeleting: false, shift: null, status: 'idle', formError: null });
    await useShiftStore.getState().reloadWeek();
    return true;
  },

  clearFormError() {
    set({ formError: null });
  },

  reset() {
    set({
      shiftId: null,
      shift: null,
      status: 'idle',
      loadError: null,
      isSaving: false,
      isDeleting: false,
      formError: null,
    });
  },
}));

/** Whether the loaded shift is still running (edited from the Active tab instead). */
export const selectEditingRunningShift = (state: ShiftEditorState): boolean =>
  state.shift !== null && state.shift.endTime === null;
