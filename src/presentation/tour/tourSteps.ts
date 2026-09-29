/**
 * Feature tour content.
 *
 * Deliberately data-only: the overlay component renders whatever is in here, so
 * adding or rewording a step never touches UI code.
 */
import type { IoniconName } from '../components/icon-name';

export interface TourStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: IoniconName;
  /** Screen to show behind the tour card while this step is on. */
  readonly route: string;
  /** Hidden unless the mock developer tooling is available. */
  readonly devOnly?: boolean;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'week',
    title: 'Your week at a glance',
    description:
      'Every shift for the selected week, plus totals for hours worked and unpaid breaks. Use the arrows to move between weeks.',
    icon: 'calendar-outline',
    route: '/',
  },
  {
    id: 'active',
    title: 'Clock on with a live timer',
    description:
      'Start a shift and the timer runs from its exact start time, so it stays accurate even after the app is backgrounded or closed. End the shift here too.',
    icon: 'pulse-outline',
    route: '/active',
  },
  {
    id: 'create',
    title: 'Log a shift by hand',
    description:
      'Add a completed shift in seconds. The end time must be after the start time, and your week refreshes the moment it saves.',
    icon: 'create-outline',
    route: '/create',
  },
  {
    id: 'mock-controls',
    title: 'Simulate failures',
    description:
      'Tap the arrow on the right edge for mock API controls: force every request to fail, watch the error and retry states, then switch it back off.',
    icon: 'bug-outline',
    route: '/',
    devOnly: true,
  },
];

/**
 * Steps that apply to the current build.
 *
 * `devToolsEnabled` is injected rather than read here, so this module stays
 * pure data (no container/native dependency) and is trivially verifiable.
 */
export function resolveTourSteps(devToolsEnabled: boolean): readonly TourStep[] {
  return TOUR_STEPS.filter((step) => step.devOnly !== true || devToolsEnabled);
}
