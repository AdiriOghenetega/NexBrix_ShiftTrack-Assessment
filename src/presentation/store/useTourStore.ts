import { create } from 'zustand';

import { container } from '@/infrastructure/appContainer';

import { isMockDevToolsEnabled } from '../components/mockDevTools';
import { resolveTourSteps, type TourStep } from '../tour/tourSteps';

/**
 * Storage key for the "tour already seen" flag.
 *
 * Presentation-only UI preference, so it is written through the container's
 * storage port rather than through a use case.
 */
const TOUR_STORAGE_KEY = 'shifttrack.tour.v1';
const TOUR_COMPLETED_VALUE = 'completed';

async function isTourCompleted(): Promise<boolean> {
  try {
    return (await container.storage.getItem(TOUR_STORAGE_KEY)) === TOUR_COMPLETED_VALUE;
  } catch {
    // Unreadable storage must not block the app; fall back to showing the tour.
    return false;
  }
}

async function markTourCompleted(): Promise<void> {
  try {
    await container.storage.setItem(TOUR_STORAGE_KEY, TOUR_COMPLETED_VALUE);
  } catch {
    // Worst case the tour reappears next launch. Never surface this to the user.
  }
}

export interface TourState {
  /** Steps applicable to this build. */
  readonly steps: readonly TourStep[];
  readonly isActive: boolean;
  readonly stepIndex: number;
  /** Guards the one-shot auto-start so it cannot run twice per session. */
  readonly hasChecked: boolean;
  /** Shows the tour once per install, before anything else. */
  readonly checkAndAutoStart: () => Promise<void>;
  /** Re-opens the tour on demand (e.g. from the "replay" button). */
  readonly startTour: () => void;
  readonly nextStep: () => Promise<void>;
  readonly previousStep: () => void;
  /** Closes the tour and remembers that it has been seen. */
  readonly dismissTour: () => Promise<void>;
  /** Closes the tour without remembering, so it can auto-start again later. */
  readonly cancelTour: () => void;
}

export const useTourStore = create<TourState>()((set, get) => ({
  steps: resolveTourSteps(isMockDevToolsEnabled()),
  isActive: false,
  stepIndex: 0,
  hasChecked: false,

  async checkAndAutoStart() {
    if (get().hasChecked) {
      return;
    }
    set({ hasChecked: true });

    if (get().steps.length === 0) {
      return;
    }
    if (await isTourCompleted()) {
      return;
    }

    set({ isActive: true, stepIndex: 0 });
  },

  startTour() {
    set({ isActive: true, stepIndex: 0, hasChecked: true });
  },

  async nextStep() {
    const { stepIndex, steps } = get();
    if (stepIndex >= steps.length - 1) {
      await get().dismissTour();
      return;
    }
    set({ stepIndex: stepIndex + 1 });
  },

  previousStep() {
    set((state) => ({ stepIndex: Math.max(0, state.stepIndex - 1) }));
  },

  async dismissTour() {
    set({ isActive: false, stepIndex: 0 });
    await markTourCompleted();
  },

  cancelTour() {
    set({ isActive: false, stepIndex: 0 });
  },
}));
