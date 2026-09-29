/** Centralised API route table. */

export const Endpoints = {
  /** `POST` — exchange credentials for a session. */
  login: '/auth/login',
  /** `GET` — list shifts, `?weekStart=YYYY-MM-DD`. */
  shifts: '/shifts',
  /** `PATCH` — patch a single shift (used to set `endTime`). */
  shift: (shiftId: string): string => `/shifts/${encodeURIComponent(shiftId)}`,
} as const;

export function shiftsQuery(weekStartDateKey: string): string {
  return `${Endpoints.shifts}?weekStart=${encodeURIComponent(weekStartDateKey)}`;
}
