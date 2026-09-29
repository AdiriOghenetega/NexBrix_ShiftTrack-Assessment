/**
 * Mock API layer.
 *
 * Exercises routes, status mapping, business validation and — importantly —
 * the two error-simulation modes used to demo the loading/error/retry states.
 */

import { isAppError } from '@/core/errors';
import type { HttpRequest, IHttpClient } from '@/core/interfaces/IHttpClient';
import { FetchHttpClient } from '@/infrastructure/api/FetchHttpClient';
import { DEMO_CREDENTIALS } from '@/infrastructure/api/mockDatabase';
import { mockServer } from '@/infrastructure/api/mockServer';
import { Endpoints } from '@/infrastructure/api/endpoints';
import { AuthRepository } from '@/infrastructure/repositories/AuthRepository';
import { ShiftRepository } from '@/infrastructure/repositories/ShiftRepository';
import { createInMemoryStorage } from '@/infrastructure/storage/InMemoryStorage';
import { ACCESS_TOKEN_STORAGE_KEY } from '@/infrastructure/storage/storageKeys';
import { getWeekStartKey } from '@/core/utils/time';

const BASE_URL = 'https://api.shifttrack.test';

interface Harness {
  readonly client: IHttpClient;
  readonly shifts: ShiftRepository;
  readonly auth: AuthRepository;
}

function createHarness(): Harness {
  const storage = createInMemoryStorage();
  const client = new FetchHttpClient({
    baseUrl: BASE_URL,
    useMockApi: true,
    getAccessToken: () => storage.getItem(ACCESS_TOKEN_STORAGE_KEY),
  });
  return {
    client,
    shifts: new ShiftRepository(client),
    auth: new AuthRepository(client, storage),
  };
}

async function authenticate(harness: Harness): Promise<void> {
  const session = await harness.auth.signIn(DEMO_CREDENTIALS);
  await harness.auth.persistSession(session);
}

beforeEach(() => {
  mockServer.resetConfig();
  mockServer.configure({ latencyMs: 0, alwaysFail: false, failureRate: 0 });
  mockServer.resetDatabase();
});

describe('POST /auth/login', () => {
  it('issues a session for the demo credentials', async () => {
    const harness = createHarness();
    const response = await harness.client.request<{ token: string; user: { email: string } }>({
      method: 'POST',
      path: Endpoints.login,
      body: DEMO_CREDENTIALS,
    });

    expect(response.status).toBe(200);
    expect(response.data.user.email).toBe(DEMO_CREDENTIALS.email);
    expect(response.data.token).toContain('mocktoken_');
  });

  it('maps a 401 to an UNAUTHORIZED AppError', async () => {
    const harness = createHarness();

    let caught: unknown;
    try {
      await harness.client.request({
        method: 'POST',
        path: Endpoints.login,
        body: { email: DEMO_CREDENTIALS.email, password: 'nope' },
      });
    } catch (error) {
      caught = error;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('UNAUTHORIZED');
      expect(caught.message).toBe('Incorrect email or password.');
    }
  });

  it('maps a missing body to a VALIDATION AppError', async () => {
    const harness = createHarness();

    await expect(harness.client.request({ method: 'POST', path: Endpoints.login, body: {} })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});

describe('GET /shifts', () => {
  it('requires a bearer token', async () => {
    const harness = createHarness();
    const unauthenticated = new FetchHttpClient({ baseUrl: BASE_URL, useMockApi: true });

    await expect(
      new ShiftRepository(unauthenticated).getShiftsByWeek(getWeekStartKey()),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    await authenticate(harness);
    await expect(harness.shifts.getShiftsByWeek(getWeekStartKey())).resolves.toBeInstanceOf(Array);
  });

  it('rejects a malformed weekStart', async () => {
    const harness = createHarness();
    await authenticate(harness);

    await expect(harness.shifts.getShiftsByWeek('28-09-2026')).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('returns the seeded shifts of the current week', async () => {
    const harness = createHarness();
    await authenticate(harness);

    const shifts = await harness.shifts.getShiftsByWeek(getWeekStartKey());

    expect(shifts.length).toBeGreaterThan(0);
    for (const shift of shifts) {
      expect(shift.userId).toBe('usr_staff_001');
      expect(Date.parse(shift.startTime)).not.toBeNaN();
    }
  });
});

describe('POST /shifts', () => {
  it('creates a shift and returns it in the weekly list', async () => {
    const harness = createHarness();
    await authenticate(harness);

    const startTime = new Date(Date.now() + 60_000).toISOString();
    const endTime = new Date(Date.now() + 3_600_000).toISOString();

    const created = await harness.shifts.createShift({ startTime, endTime, breakMinutes: 15, note: 'Test' });
    expect(created.id).toBeTruthy();
    expect(created.breakMinutes).toBe(15);
    expect(created.note).toBe('Test');

    const week = await harness.shifts.getShiftsByWeek(getWeekStartKey());
    expect(week.some((shift) => shift.id === created.id)).toBe(true);
  });

  it('rejects an end time before the start time with a field error', async () => {
    const harness = createHarness();
    await authenticate(harness);

    let caught: unknown;
    try {
      await harness.shifts.createShift({
        startTime: new Date(Date.now() + 3_600_000).toISOString(),
        endTime: new Date().toISOString(),
        breakMinutes: 0,
      });
    } catch (error) {
      caught = error;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('VALIDATION');
      expect(caught.fieldErrors?.endTime).toBe('End time must be after start time.');
    }
  });

  it('rejects a negative break', async () => {
    const harness = createHarness();
    await authenticate(harness);

    await expect(
      harness.client.request({
        method: 'POST',
        path: Endpoints.shifts,
        body: { startTime: new Date().toISOString(), endTime: null, breakMinutes: -5 },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('refuses a second concurrent running shift with 409 CONFLICT', async () => {
    const harness = createHarness();
    await authenticate(harness);

    const now = new Date().toISOString();
    await harness.shifts.createShift({ startTime: now, endTime: null, breakMinutes: 0 });

    await expect(
      harness.shifts.createShift({ startTime: now, endTime: null, breakMinutes: 0 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('PATCH /shifts/:id', () => {
  it('ends a running shift', async () => {
    const harness = createHarness();
    await authenticate(harness);

    const created = await harness.shifts.createShift({
      startTime: new Date(Date.now() - 60_000).toISOString(),
      endTime: null,
      breakMinutes: 0,
    });

    const endTime = new Date().toISOString();
    const ended = await harness.shifts.updateShift(created.id, { endTime });

    expect(ended.endTime).toBe(endTime);
  });

  it('404s for an unknown shift', async () => {
    const harness = createHarness();
    await authenticate(harness);

    await expect(harness.shifts.updateShift('shift_does_not_exist', { endTime: new Date().toISOString() })).rejects.toMatchObject(
      { code: 'NOT_FOUND' },
    );
  });

  it('rejects a patch that would invert the range', async () => {
    const harness = createHarness();
    await authenticate(harness);

    const start = new Date(Date.now() + 3_600_000).toISOString();
    const created = await harness.shifts.createShift({
      startTime: start,
      endTime: new Date(Date.now() + 7_200_000).toISOString(),
      breakMinutes: 0,
    });

    await expect(harness.shifts.updateShift(created.id, { endTime: start })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});

describe('error simulation flags', () => {
  it('fails every request while "always fail" is on, then recovers', async () => {
    const harness = createHarness();

    mockServer.setAlwaysFail(true);
    await expect(
      harness.client.request({ method: 'POST', path: Endpoints.login, body: DEMO_CREDENTIALS }),
    ).rejects.toMatchObject({ code: 'NETWORK' });

    mockServer.setAlwaysFail(false);
    const response = await harness.client.request<{ token: string }>({
      method: 'POST',
      path: Endpoints.login,
      body: DEMO_CREDENTIALS,
    });
    expect(response.status).toBe(200);
  });

  it('fails exactly one request with "fail next"', async () => {
    const harness = createHarness();
    mockServer.failNext();

    await expect(
      harness.client.request({ method: 'POST', path: Endpoints.login, body: DEMO_CREDENTIALS }),
    ).rejects.toMatchObject({ code: 'NETWORK' });

    // The one-shot flag was consumed, so the retry succeeds (proves Retry works).
    const response = await harness.client.request<{ token: string }>({
      method: 'POST',
      path: Endpoints.login,
      body: DEMO_CREDENTIALS,
    });
    expect(response.status).toBe(200);
  });

  it('honours a 100% failure rate', async () => {
    const harness = createHarness();
    mockServer.setFailureRate(1);

    await expect(
      harness.client.request({ method: 'POST', path: Endpoints.login, body: DEMO_CREDENTIALS }),
    ).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('exposes the current configuration for the dev panel', () => {
    mockServer.configure({ latencyMs: 120, failureRate: 0.5, alwaysFail: true });
    expect(mockServer.getConfig()).toMatchObject({ latencyMs: 120, failureRate: 0.5, alwaysFail: true });
  });

  it('clamps the failure rate into 0..1', () => {
    expect(mockServer.setFailureRate(5).failureRate).toBe(1);
    expect(mockServer.setFailureRate(-1).failureRate).toBe(0);
  });
});

describe('unknown routes', () => {
  it('returns NOT_FOUND', async () => {
    const harness = createHarness();
    await expect(harness.client.request({ method: 'GET', path: '/nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws a NETWORK error when the mock layer is disabled', async () => {
    const request: HttpRequest = { method: 'GET', path: Endpoints.shifts };
    mockServer.setEnabled(false);

    await expect(mockServer.handle(request)).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
