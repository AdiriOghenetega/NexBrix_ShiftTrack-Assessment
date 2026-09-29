/**
 * In-app mock API layer.
 *
 * Simulates the four ShiftTrack endpoints with configurable latency, an
 * in-memory database and two flavours of failure:
 *   - "hard" network failures (thrown, no response) — exercises retry/error states
 *   - HTTP error responses (400/401/404/409) — exercises validation messaging
 *
 * The `enabled` / `alwaysFail` / `failureRate` flags are what make the
 * loading, error and empty states demoable without touching the network.
 */

import type { AppErrorCode } from '@/core/errors';
import { AppError } from '@/core/errors';
import type { HttpRequest, HttpResponse } from '@/core/interfaces/IHttpClient';
import { getWeekStartKey, isValidDateKey } from '@/core/utils/time';
import { END_BEFORE_START_MESSAGE, getBreakMinutesError } from '@/core/validation/shiftValidation';

import type { ApiErrorBodyDto, ShiftDto, UserDto } from './dto';
import { activeShiftWindowWeekStarts } from './activeShiftWindow';
import { Endpoints } from './endpoints';
import {
  createMockDatabase,
  DEMO_CREDENTIALS,
  type MockDatabase,
  type MockUserRecord,
} from './mockDatabase';

export interface MockServerConfig {
  /** When `false` every request is forwarded to the real network. */
  readonly enabled: boolean;
  /** Artificial round-trip latency in milliseconds. */
  readonly latencyMs: number;
  /** Probability (0..1) that a request fails as a simulated network error. */
  readonly failureRate: number;
  /** Master switch: every request fails as a simulated network error. */
  readonly alwaysFail: boolean;
  /** One-shot switch: the next request fails, then the flag resets. */
  readonly failNextRequest: boolean;
}

export type MockServerConfigPatch = Partial<MockServerConfig>;

const TOKEN_PREFIX = 'mocktoken_';
const NETWORK_FAILURE_MESSAGE = 'Simulated network failure (mock error mode is on).';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse<T>(status: number, data: T): HttpResponse<T> {
  return { status, data };
}

/** For routes that report success without a body (e.g. `DELETE`). */
function emptyResponse(status: number): HttpResponse<null> {
  return { status, data: null };
}

function errorResponse(
  status: number,
  code: AppErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): HttpResponse<ApiErrorBodyDto> {
  return {
    status,
    data: { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
  };
}

/** Splits `/shifts?weekStart=...` into pathname + query params. */
function splitRequestPath(path: string): { pathname: string; searchParams: URLSearchParams } {
  const queryIndex = path.indexOf('?');
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : path.slice(queryIndex + 1);
  return { pathname, searchParams: new URLSearchParams(query) };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readHeader(headers: Readonly<Record<string, string>> | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}

type AuthOutcome =
  | { readonly ok: true; readonly user: MockUserRecord }
  | { readonly ok: false; readonly response: HttpResponse<ApiErrorBodyDto> };

export class MockServer {
  private config: MockServerConfig;

  private database: MockDatabase = createMockDatabase();

  constructor(config: Partial<MockServerConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      latencyMs: config.latencyMs ?? 650,
      failureRate: config.failureRate ?? 0,
      alwaysFail: config.alwaysFail ?? false,
      failNextRequest: config.failNextRequest ?? false,
    };
  }

  // ---------------------------------------------------------------- controls

  getConfig(): MockServerConfig {
    return { ...this.config };
  }

  configure(patch: MockServerConfigPatch): MockServerConfig {
    this.config = { ...this.config, ...patch };
    return this.getConfig();
  }

  setEnabled(enabled: boolean): MockServerConfig {
    return this.configure({ enabled });
  }

  setLatencyMs(latencyMs: number): MockServerConfig {
    return this.configure({ latencyMs: Math.max(0, Math.round(latencyMs)) });
  }

  /** `rate` is clamped to the 0..1 range. */
  setFailureRate(rate: number): MockServerConfig {
    return this.configure({ failureRate: Math.min(1, Math.max(0, rate)) });
  }

  setAlwaysFail(alwaysFail: boolean): MockServerConfig {
    return this.configure({ alwaysFail });
  }

  toggleAlwaysFail(): MockServerConfig {
    return this.configure({ alwaysFail: !this.config.alwaysFail });
  }

  failNext(): MockServerConfig {
    return this.configure({ failNextRequest: true });
  }

  resetConfig(): MockServerConfig {
    this.config = {
      enabled: true,
      latencyMs: 650,
      failureRate: 0,
      alwaysFail: false,
      failNextRequest: false,
    };
    return this.getConfig();
  }

  /** Re-seeds the in-memory shifts (removes anything created during the demo). */
  resetDatabase(): void {
    this.database = createMockDatabase();
  }

  countShifts(): number {
    return this.database.countShifts();
  }

  seedCredentials(): typeof DEMO_CREDENTIALS {
    return DEMO_CREDENTIALS;
  }

  // ----------------------------------------------------------------- routing

  async handle(request: HttpRequest): Promise<HttpResponse<unknown>> {
    if (!this.config.enabled) {
      throw new AppError('NETWORK', 'The mock API layer is disabled, but no real backend is configured.');
    }

    if (this.config.latencyMs > 0) {
      await delay(this.config.latencyMs);
    }

    if (this.shouldSimulateNetworkFailure()) {
      throw new AppError('NETWORK', NETWORK_FAILURE_MESSAGE);
    }

    const { pathname, searchParams } = splitRequestPath(request.path);

    if (request.method === 'POST' && pathname === Endpoints.login) {
      return this.handleLogin(request);
    }
    if (request.method === 'GET' && pathname === Endpoints.shifts) {
      return this.handleListShifts(request, searchParams);
    }
    if (request.method === 'POST' && pathname === Endpoints.shifts) {
      return this.handleCreateShift(request);
    }

    const shiftIdMatch = /^\/shifts\/([^/]+)$/.exec(pathname);
    if (shiftIdMatch?.[1]) {
      const shiftId = decodeURIComponent(shiftIdMatch[1]);
      if (request.method === 'GET') {
        return this.handleGetShift(request, shiftId);
      }
      if (request.method === 'PATCH') {
        return this.handlePatchShift(request, shiftId);
      }
      if (request.method === 'DELETE') {
        return this.handleDeleteShift(request, shiftId);
      }
    }

    return errorResponse(404, 'NOT_FOUND', `No mock route for ${request.method} ${pathname}.`);
  }

  // ---------------------------------------------------------------- handlers

  private handleLogin(request: HttpRequest): HttpResponse<unknown> {
    const body = toRecord(request.body);
    const email = typeof body?.email === 'string' ? body.email : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return errorResponse(400, 'VALIDATION', 'Email and password are required.');
    }

    const user = this.database.findUserByEmail(email);
    if (!user || user.password !== password) {
      return errorResponse(401, 'UNAUTHORIZED', 'Incorrect email or password.');
    }

    const issuedAt = new Date().toISOString();
    return jsonResponse(200, {
      token: createToken(user.id, Date.now()),
      issuedAt,
      user: toUserDto(user),
    });
  }

  private handleListShifts(request: HttpRequest, searchParams: URLSearchParams): HttpResponse<unknown> {
    const auth = this.authenticate(request);
    if (!auth.ok) {
      return auth.response;
    }

    const weekStart = searchParams.get('weekStart') ?? getWeekStartKey(new Date());
    if (!isValidDateKey(weekStart)) {
      return errorResponse(400, 'VALIDATION', '`weekStart` must be a YYYY-MM-DD date.');
    }

    return jsonResponse(200, { shifts: this.database.listShiftsForWeek(auth.user.id, weekStart) });
  }

  private handleCreateShift(request: HttpRequest): HttpResponse<unknown> {
    const auth = this.authenticate(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = toRecord(request.body);
    if (!body) {
      return errorResponse(400, 'VALIDATION', 'A JSON body is required.');
    }

    const startTime = typeof body.startTime === 'string' ? body.startTime : '';
    if (!startTime || Number.isNaN(Date.parse(startTime))) {
      return errorResponse(400, 'VALIDATION', '`startTime` must be an ISO-8601 timestamp.', {
        startTime: 'Start time is required.',
      });
    }

    const rawEndTime = body.endTime;
    const endTime = typeof rawEndTime === 'string' ? rawEndTime : null;
    if (endTime !== null && Number.isNaN(Date.parse(endTime))) {
      return errorResponse(400, 'VALIDATION', '`endTime` must be an ISO-8601 timestamp or null.', {
        endTime: 'End time is invalid.',
      });
    }

    if (endTime !== null && Date.parse(endTime) <= Date.parse(startTime)) {
      return errorResponse(400, 'VALIDATION', END_BEFORE_START_MESSAGE, { endTime: END_BEFORE_START_MESSAGE });
    }

    const breakMinutes = typeof body.breakMinutes === 'number' ? body.breakMinutes : 0;
    const breakError = getBreakMinutesError(breakMinutes);
    if (breakError) {
      return errorResponse(400, 'VALIDATION', breakError, { breakMinutes: breakError });
    }

    // Scoped to the same lookback window the client searches, so a forgotten
    // clock-in the app cannot surface never blocks starting a new shift.
    if (
      endTime === null &&
      this.database.findActiveShiftInWeeks(auth.user.id, activeShiftWindowWeekStarts())
    ) {
      return errorResponse(409, 'CONFLICT', 'A shift is already running.');
    }

    const nowIso = new Date().toISOString();
    const shift = this.database.insertShift({
      id: '',
      userId: auth.user.id,
      startTime: new Date(startTime).toISOString(),
      endTime: endTime === null ? null : new Date(endTime).toISOString(),
      breakMinutes,
      note: typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return jsonResponse(201, { shift });
  }

  /** Resolves the shift addressed by the request, or the error response to send. */
  private findOwnedShift(
    request: HttpRequest,
    shiftId: string,
  ): { readonly ok: true; readonly shift: ShiftDto } | { readonly ok: false; readonly response: HttpResponse<ApiErrorBodyDto> } {
    const auth = this.authenticate(request);
    if (!auth.ok) {
      return { ok: false, response: auth.response };
    }

    const shift = this.database.findShiftById(shiftId);
    if (!shift || shift.userId !== auth.user.id) {
      return { ok: false, response: errorResponse(404, 'NOT_FOUND', 'That shift could not be found.') };
    }

    return { ok: true, shift };
  }

  private handleGetShift(request: HttpRequest, shiftId: string): HttpResponse<unknown> {
    const found = this.findOwnedShift(request, shiftId);
    if (!found.ok) {
      return found.response;
    }
    return jsonResponse(200, { shift: found.shift });
  }

  private handleDeleteShift(request: HttpRequest, shiftId: string): HttpResponse<unknown> {
    const found = this.findOwnedShift(request, shiftId);
    if (!found.ok) {
      return found.response;
    }

    this.database.deleteShift(shiftId);
    return emptyResponse(204);
  }

  private handlePatchShift(request: HttpRequest, shiftId: string): HttpResponse<unknown> {
    const found = this.findOwnedShift(request, shiftId);
    if (!found.ok) {
      return found.response;
    }
    const { shift: existing } = found;

    const body = toRecord(request.body);
    if (!body) {
      return errorResponse(400, 'VALIDATION', 'A JSON body is required.');
    }

    // Built up field by field, so it stays a mutable local shape and is handed
    // to the database as a `ShiftPatch` at the end.
    const patch: {
      startTime?: string;
      endTime?: string | null;
      breakMinutes?: number;
      note?: string | null;
    } = {};

    if ('startTime' in body) {
      const rawStartTime = body.startTime;
      if (typeof rawStartTime === 'string' && !Number.isNaN(Date.parse(rawStartTime))) {
        patch.startTime = new Date(rawStartTime).toISOString();
      } else {
        return errorResponse(400, 'VALIDATION', '`startTime` must be an ISO-8601 timestamp.', {
          startTime: 'Start time is invalid.',
        });
      }
    }

    if ('endTime' in body) {
      const rawEndTime = body.endTime;
      if (rawEndTime === null) {
        patch.endTime = null;
      } else if (typeof rawEndTime === 'string' && !Number.isNaN(Date.parse(rawEndTime))) {
        patch.endTime = new Date(rawEndTime).toISOString();
      } else {
        return errorResponse(400, 'VALIDATION', '`endTime` must be an ISO-8601 timestamp or null.', {
          endTime: 'End time is invalid.',
        });
      }
    }

    // Validate the pair the patch *results in*, not just the incoming field, so
    // shifting the start past an unchanged end is rejected too.
    const effectiveStart = patch.startTime ?? existing.startTime;
    const effectiveEnd = 'endTime' in patch ? patch.endTime ?? null : existing.endTime;
    if (effectiveEnd !== null && Date.parse(effectiveEnd) <= Date.parse(effectiveStart)) {
      return errorResponse(400, 'VALIDATION', END_BEFORE_START_MESSAGE, { endTime: END_BEFORE_START_MESSAGE });
    }

    if ('breakMinutes' in body) {
      const breakMinutes = typeof body.breakMinutes === 'number' ? body.breakMinutes : Number.NaN;
      const breakError = getBreakMinutesError(breakMinutes);
      if (breakError) {
        return errorResponse(400, 'VALIDATION', breakError, { breakMinutes: breakError });
      }
      patch.breakMinutes = breakMinutes;
    }

    if ('note' in body) {
      patch.note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null;
    }

    const updated = this.database.patchShift(shiftId, patch);
    if (!updated) {
      return errorResponse(404, 'NOT_FOUND', 'That shift could not be found.');
    }

    return jsonResponse(200, { shift: updated });
  }

  // ------------------------------------------------------------------ helpers

  private authenticate(request: HttpRequest): AuthOutcome {
    const header = readHeader(request.headers, 'authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!token) {
      return {
        ok: false,
        response: errorResponse(401, 'UNAUTHORIZED', 'A bearer token is required.'),
      };
    }

    const parsed = parseToken(token);
    const user = parsed ? this.database.findUserById(parsed.userId) : undefined;
    if (!user) {
      return {
        ok: false,
        response: errorResponse(401, 'UNAUTHORIZED', 'Your session is no longer valid.'),
      };
    }

    return { ok: true, user };
  }

  private shouldSimulateNetworkFailure(): boolean {
    if (this.config.alwaysFail) {
      return true;
    }
    if (this.config.failNextRequest) {
      this.config = { ...this.config, failNextRequest: false };
      return true;
    }
    return this.config.failureRate > 0 && Math.random() < this.config.failureRate;
  }
}

function toUserDto(user: MockUserRecord): UserDto {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function createToken(userId: string, issuedAtMs: number): string {
  return `${TOKEN_PREFIX}${userId}_${issuedAtMs}`;
}

function parseToken(token: string): { userId: string; issuedAtMs: number } | null {
  if (!token.startsWith(TOKEN_PREFIX)) {
    return null;
  }
  const rest = token.slice(TOKEN_PREFIX.length);
  const separator = rest.lastIndexOf('_');
  if (separator <= 0) {
    return null;
  }
  const userId = rest.slice(0, separator);
  const issuedAtMs = Number(rest.slice(separator + 1));
  if (!userId || !Number.isFinite(issuedAtMs)) {
    return null;
  }
  return { userId, issuedAtMs };
}

/** App-wide singleton used by the composition root and the dev panel. */
export const mockServer = new MockServer();

export type { ShiftDto };
