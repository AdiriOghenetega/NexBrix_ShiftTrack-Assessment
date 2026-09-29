/**
 * Composition root integration test.
 *
 * The container is deliberately free of native imports, so the whole graph can
 * be exercised in Node with an in-memory storage adapter — the same wiring the
 * app uses, minus the keychain.
 */

import { combineDateKeyAndTime, getWeekStartKey } from '@/core/utils/time';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import { createAppContainer, type AppContainer } from '@/infrastructure/container';
import { DEMO_CREDENTIALS } from '@/infrastructure/api/mockDatabase';
import { mockServer } from '@/infrastructure/api/mockServer';
import { createInMemoryStorage, type InMemoryStorage } from '@/infrastructure/storage/InMemoryStorage';

const config: AppConfig = {
  apiBaseUrl: 'https://api.shifttrack.test',
  apiTimeoutMs: 5_000,
  mockApiEnabled: true,
  mockLatencyMs: 0,
  mockErrorsEnabled: false,
};

function createTestContainer(storage: InMemoryStorage = createInMemoryStorage()): {
  container: AppContainer;
  storage: InMemoryStorage;
} {
  return { container: createAppContainer({ storage, config }), storage };
}

async function signIn(container: AppContainer): Promise<void> {
  const result = await container.authenticateUser.execute(DEMO_CREDENTIALS);
  if (!result.ok) {
    throw new Error(`Expected sign in to succeed: ${result.error.message}`);
  }
}

beforeEach(() => {
  mockServer.resetConfig();
  mockServer.configure({ latencyMs: 0, alwaysFail: false, failureRate: 0 });
  mockServer.resetDatabase();
});

describe('app container', () => {
  it('signs in, and restores the session in a second container (restart)', async () => {
    const storage = createInMemoryStorage();
    const first = createTestContainer(storage).container;
    await signIn(first);

    const second = createTestContainer(storage).container;
    const restored = await second.restoreSession.execute();

    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.value?.user.email).toBe(DEMO_CREDENTIALS.email);
    }
  });

  it('loads the current week through the repository + mock API', async () => {
    const { container } = createTestContainer();
    await signIn(container);

    const result = await container.getWeeklyShifts.execute({ weekStartDateKey: getWeekStartKey() });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);
    }
  });

  it('creates a shift and immediately sees it in the week (instant refetch)', async () => {
    const { container } = createTestContainer();
    await signIn(container);

    const weekStart = getWeekStartKey();
    const created = await container.createShift.execute({
      startTime: combineDateKeyAndTime(weekStart, '10:00'),
      endTime: combineDateKeyAndTime(weekStart, '14:30'),
      breakMinutes: 30,
      note: 'Integration test',
    });

    expect(created.ok).toBe(true);

    const week = await container.getWeeklyShifts.execute({ weekStartDateKey: weekStart });
    expect(week.ok).toBe(true);
    if (week.ok && created.ok) {
      const found = week.value.find((shift) => shift.id === created.value.id);
      expect(found?.note).toBe('Integration test');
      expect(found?.breakMinutes).toBe(30);
    }
  });

  it('propagates the end-time rule from the use case down through the API', async () => {
    const { container } = createTestContainer();
    await signIn(container);

    const weekStart = getWeekStartKey();
    const result = await container.createShift.execute({
      startTime: combineDateKeyAndTime(weekStart, '17:00'),
      endTime: combineDateKeyAndTime(weekStart, '09:00'),
      breakMinutes: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.fieldErrors?.endTime).toBe('End time must be after start time.');
    }
  });

  it('starts and ends an active shift end to end', async () => {
    const { container } = createTestContainer();
    await signIn(container);

    // Nothing is running on a fresh mock database.
    const initial = await container.getActiveShift.execute();
    expect(initial.ok && initial.value).toBeNull();

    const started = await container.startShift.execute({ breakMinutes: 15 });
    expect(started.ok).toBe(true);
    const shiftId = started.ok ? started.value.id : '';
    expect(shiftId).not.toBe('');

    const running = await container.getActiveShift.execute();
    expect(running.ok && running.value?.id).toBe(shiftId);

    const ended = await container.endShift.execute({ shiftId });
    expect(ended.ok).toBe(true);

    const after = await container.getActiveShift.execute();
    expect(after.ok && after.value).toBeNull();
  });

  it('prevents a second concurrent shift', async () => {
    const { container } = createTestContainer();
    await signIn(container);

    await container.startShift.execute({ breakMinutes: 0 });
    const second = await container.startShift.execute({ breakMinutes: 0 });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('CONFLICT');
    }
  });

  it('surfaces simulated network failures and recovers once they are disabled', async () => {
    const { container } = createTestContainer();
    await signIn(container);

    mockServer.setAlwaysFail(true);
    const failed = await container.getWeeklyShifts.execute({ weekStartDateKey: getWeekStartKey() });
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error.code).toBe('NETWORK');
    }

    mockServer.setAlwaysFail(false);
    const retried = await container.getWeeklyShifts.execute({ weekStartDateKey: getWeekStartKey() });
    expect(retried.ok).toBe(true);
  });

  it('clears the persisted session on sign out', async () => {
    const storage = createInMemoryStorage();
    const { container } = createTestContainer(storage);
    await signIn(container);

    const signedOut = await container.signOutUser.execute();
    expect(signedOut.ok).toBe(true);
    expect(storage.snapshot()).toEqual({});

    const restored = await container.restoreSession.execute();
    expect(restored.ok && restored.value).toBeNull();
  });
});
