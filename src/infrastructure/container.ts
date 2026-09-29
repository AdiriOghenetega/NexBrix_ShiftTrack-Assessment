/**
 * Composition root.
 *
 * This is the only place that knows how the layers are wired together. The
 * presentation layer imports the app container and never constructs a
 * repository, HTTP client or storage adapter itself — which is what keeps the
 * dependency rule pointing inward.
 *
 * Note that this module deliberately avoids importing any native module: the
 * concrete `ISecureStorage` adapter is injected by `./appContainer`. That keeps
 * the whole graph constructible in a plain Node environment (see
 * `src/__tests__/infrastructure/container.test.ts`).
 */

import type { IAuthRepository } from '@/core/interfaces/IAuthRepository';
import type { IHttpClient } from '@/core/interfaces/IHttpClient';
import type { ISecureStorage } from '@/core/interfaces/ISecureStorage';
import type { IShiftRepository } from '@/core/interfaces/IShiftRepository';
import { AuthenticateUser } from '@/core/usecases/AuthenticateUser';
import { CreateShift } from '@/core/usecases/CreateShift';
import { DeleteShift } from '@/core/usecases/DeleteShift';
import { EndShift } from '@/core/usecases/EndShift';
import { GetActiveShift } from '@/core/usecases/GetActiveShift';
import { GetShiftById } from '@/core/usecases/GetShiftById';
import { GetWeeklyShifts } from '@/core/usecases/GetWeeklyShifts';
import { RestoreSession } from '@/core/usecases/RestoreSession';
import { SignOutUser } from '@/core/usecases/SignOutUser';
import { StartShift } from '@/core/usecases/StartShift';
import { UpdateShift } from '@/core/usecases/UpdateShift';

import { FetchHttpClient } from './api/FetchHttpClient';
import { mockServer } from './api/mockServer';
import { loadAppConfig, type AppConfig } from './config/appConfig';
import { AuthRepository } from './repositories/AuthRepository';
import { ShiftRepository } from './repositories/ShiftRepository';
import { ACCESS_TOKEN_STORAGE_KEY } from './storage/storageKeys';

export interface AppContainer {
  readonly config: AppConfig;
  readonly mockServer: typeof mockServer;
  readonly storage: ISecureStorage;
  readonly httpClient: IHttpClient;
  /**
   * Registers (or clears, with `null`) the callback invoked when an
   * authenticated request is rejected with `401`. The presentation layer wires
   * this to session expiry so a stale token signs the user out instead of
   * trapping them in a retry loop.
   */
  readonly setUnauthorizedHandler: (handler: (() => void) | null) => void;
  readonly authRepository: IAuthRepository;
  readonly shiftRepository: IShiftRepository;
  readonly authenticateUser: AuthenticateUser;
  readonly restoreSession: RestoreSession;
  readonly signOutUser: SignOutUser;
  readonly getWeeklyShifts: GetWeeklyShifts;
  readonly getActiveShift: GetActiveShift;
  readonly getShiftById: GetShiftById;
  readonly createShift: CreateShift;
  readonly updateShift: UpdateShift;
  readonly deleteShift: DeleteShift;
  readonly startShift: StartShift;
  readonly endShift: EndShift;
}

export interface CreateContainerOverrides {
  readonly storage: ISecureStorage;
  readonly config?: AppConfig;
  readonly httpClient?: IHttpClient;
  readonly authRepository?: IAuthRepository;
  readonly shiftRepository?: IShiftRepository;
}

export function createAppContainer(overrides: CreateContainerOverrides): AppContainer {
  const config = overrides.config ?? loadAppConfig();
  const { storage } = overrides;

  // Keep the mock layer's runtime flags in sync with the environment/config.
  mockServer.configure({
    enabled: config.mockApiEnabled,
    latencyMs: config.mockLatencyMs,
    alwaysFail: config.mockErrorsEnabled,
  });

  const httpClient =
    overrides.httpClient ??
    new FetchHttpClient({
      baseUrl: config.apiBaseUrl,
      timeoutMs: config.apiTimeoutMs,
      useMockApi: config.mockApiEnabled,
      getAccessToken: () => storage.getItem(ACCESS_TOKEN_STORAGE_KEY),
    });

  const authRepository = overrides.authRepository ?? new AuthRepository(httpClient, storage);
  const shiftRepository = overrides.shiftRepository ?? new ShiftRepository(httpClient);

  return {
    config,
    mockServer,
    storage,
    httpClient,
    setUnauthorizedHandler(handler) {
      // Injected HTTP clients (tests, alternative transports) simply ignore this.
      if (httpClient instanceof FetchHttpClient) {
        httpClient.onUnauthorized = handler;
      }
    },
    authRepository,
    shiftRepository,
    authenticateUser: new AuthenticateUser(authRepository),
    restoreSession: new RestoreSession(authRepository),
    signOutUser: new SignOutUser(authRepository),
    getWeeklyShifts: new GetWeeklyShifts(shiftRepository),
    getActiveShift: new GetActiveShift(shiftRepository),
    getShiftById: new GetShiftById(shiftRepository),
    createShift: new CreateShift(shiftRepository),
    updateShift: new UpdateShift(shiftRepository),
    deleteShift: new DeleteShift(shiftRepository),
    startShift: new StartShift(shiftRepository),
    endShift: new EndShift(shiftRepository),
  };
}
