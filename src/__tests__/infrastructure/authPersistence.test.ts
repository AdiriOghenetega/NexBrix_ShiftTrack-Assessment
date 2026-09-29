/**
 * Auth token persistence.
 *
 * Verifies the full "sign in once, stay signed in after a restart" contract:
 * the use case persists the session, the repository writes it to encrypted
 * storage, and a brand new repository instance (i.e. a cold app start) can
 * restore it. Corrupt payloads must be discarded instead of crashing the app.
 */

import { isAppError } from '@/core/errors';
import { AuthenticateUser } from '@/core/usecases/AuthenticateUser';
import { RestoreSession } from '@/core/usecases/RestoreSession';
import { SignOutUser } from '@/core/usecases/SignOutUser';
import { FetchHttpClient } from '@/infrastructure/api/FetchHttpClient';
import { DEMO_CREDENTIALS } from '@/infrastructure/api/mockDatabase';
import { mockServer } from '@/infrastructure/api/mockServer';
import { AuthRepository } from '@/infrastructure/repositories/AuthRepository';
import { createInMemoryStorage, type InMemoryStorage } from '@/infrastructure/storage/InMemoryStorage';
import { ACCESS_TOKEN_STORAGE_KEY, SESSION_STORAGE_KEY } from '@/infrastructure/storage/storageKeys';

const BASE_URL = 'https://api.shifttrack.test';

/** Builds a repository exactly the way the composition root does. */
function buildAuthRepository(storage: InMemoryStorage): AuthRepository {
  const httpClient = new FetchHttpClient({
    baseUrl: BASE_URL,
    useMockApi: true,
    getAccessToken: () => storage.getItem(ACCESS_TOKEN_STORAGE_KEY),
  });
  return new AuthRepository(httpClient, storage);
}

beforeEach(() => {
  mockServer.resetConfig();
  mockServer.configure({ latencyMs: 0, alwaysFail: false, failureRate: 0 });
  mockServer.resetDatabase();
});

describe('AuthRepository session persistence', () => {
  it('writes the session and the token to secure storage on sign in', async () => {
    const storage = createInMemoryStorage();
    const repository = buildAuthRepository(storage);
    const useCase = new AuthenticateUser(repository);

    const result = await useCase.execute(DEMO_CREDENTIALS);
    expect(result.ok).toBe(true);

    const snapshot = storage.snapshot();
    expect(Object.keys(snapshot)).toEqual(
      expect.arrayContaining([SESSION_STORAGE_KEY, ACCESS_TOKEN_STORAGE_KEY]),
    );

    const storedSession = snapshot[SESSION_STORAGE_KEY];
    expect(storedSession).toBeDefined();
    expect(JSON.parse(storedSession ?? '{}')).toMatchObject({
      user: { email: DEMO_CREDENTIALS.email },
    });
  });

  it('keeps the token available for authenticated API calls', async () => {
    const storage = createInMemoryStorage();
    const repository = buildAuthRepository(storage);

    await new AuthenticateUser(repository).execute(DEMO_CREDENTIALS);

    const token = await repository.getAccessToken();
    expect(token).toBeTruthy();
    expect(token).toMatch(/^mocktoken_/);
  });

  it('restores the session from a fresh repository instance (cold start)', async () => {
    const storage = createInMemoryStorage();
    await new AuthenticateUser(buildAuthRepository(storage)).execute(DEMO_CREDENTIALS);

    // Simulate a full app restart: new storage handle read by a new repository.
    const restored = await new RestoreSession(buildAuthRepository(storage)).execute();

    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.value?.user.email).toBe(DEMO_CREDENTIALS.email);
      expect(restored.value?.token).toMatch(/^mocktoken_/);
    }
  });

  it('returns null (not an error) when nothing has ever been stored', async () => {
    const storage = createInMemoryStorage();
    const restored = await new RestoreSession(buildAuthRepository(storage)).execute();

    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.value).toBeNull();
    }
  });

  it('clears both keys on sign out', async () => {
    const storage = createInMemoryStorage();
    const repository = buildAuthRepository(storage);
    await new AuthenticateUser(repository).execute(DEMO_CREDENTIALS);

    const result = await new SignOutUser(repository).execute();
    expect(result.ok).toBe(true);

    expect(storage.snapshot()).toEqual({});
    expect(await repository.getAccessToken()).toBeNull();

    const restored = await new RestoreSession(buildAuthRepository(storage)).execute();
    if (restored.ok) {
      expect(restored.value).toBeNull();
    }
  });

  it('discards an unparseable payload and clears storage', async () => {
    const storage = createInMemoryStorage();
    await storage.setItem(SESSION_STORAGE_KEY, '{not json');
    await storage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'stale-token');

    const restored = await new RestoreSession(buildAuthRepository(storage)).execute();

    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.value).toBeNull();
    }
    expect(storage.snapshot()).toEqual({});
  });

  it('discards a structurally invalid session and clears storage', async () => {
    const storage = createInMemoryStorage();
    await storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: 'abc' }));
    await storage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'abc');

    const repository = buildAuthRepository(storage);
    expect(await repository.getPersistedSession()).toBeNull();
    expect(storage.snapshot()).toEqual({});
  });

  it('does not persist anything when the credentials are rejected', async () => {
    const storage = createInMemoryStorage();
    const repository = buildAuthRepository(storage);

    const result = await new AuthenticateUser(repository).execute({
      email: DEMO_CREDENTIALS.email,
      password: 'WrongPassword',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
    expect(storage.snapshot()).toEqual({});
  });

  it('surfaces storage failures to the caller instead of silently succeeding', async () => {
    const storage = createInMemoryStorage();
    jest.spyOn(storage, 'setItem').mockRejectedValue(new Error('keychain unavailable'));

    const repository = buildAuthRepository(storage);
    let caught: unknown;
    try {
      await repository.persistSession({
        token: 't',
        issuedAt: new Date().toISOString(),
        user: { id: 'u', email: 'e@e.com', name: 'E', role: 'staff' },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(isAppError(caught)).toBe(false);
  });
});
