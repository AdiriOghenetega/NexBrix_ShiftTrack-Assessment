/** Environment driven configuration (Expo inlines `EXPO_PUBLIC_*` at build time). */

export interface AppConfig {
  readonly apiBaseUrl: string;
  readonly apiTimeoutMs: number;
  readonly mockApiEnabled: boolean;
  readonly mockLatencyMs: number;
  /** Starts the mock layer in "always fail" mode so error states are demoable. */
  readonly mockErrorsEnabled: boolean;
  /**
   * Whether this is a development runtime (`__DEV__`).
   *
   * Optional so injected/test configurations may omit it; when omitted the app
   * treats the runtime as development.
   */
  readonly isDevelopmentRuntime?: boolean;
}

const DEFAULT_BASE_URL = 'https://api.shifttrack.test';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LATENCY_MS = 650;

/**
 * Metro/React Native injects `__DEV__`; it does not exist in a plain Node
 * runtime (Jest), so it is accessed through a `typeof` guard rather than being
 * referenced directly.
 */
declare const __DEV__: boolean | undefined;

const IS_DEVELOPMENT_RUNTIME: boolean = typeof __DEV__ === 'undefined' ? true : Boolean(__DEV__);

/**
 * Static `process.env` reads only — Expo inlines these at build time, so a
 * dynamic `process.env[key]` lookup would silently be `undefined` in a release
 * bundle (and is rejected by `expo/no-dynamic-env-var`).
 */
const ENV = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  apiTimeoutMs: process.env.EXPO_PUBLIC_API_TIMEOUT_MS,
  mockApi: process.env.EXPO_PUBLIC_MOCK_API,
  mockLatencyMs: process.env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  mockErrors: process.env.EXPO_PUBLIC_MOCK_ERRORS,
} as const;

function readString(value: string | undefined): string | undefined {
  return value !== undefined && value.length > 0 ? value : undefined;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  const raw = value?.toLowerCase();
  if (raw === undefined) {
    return fallback;
  }
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function readNumber(value: string | undefined, fallback: number): number {
  const raw = readString(value);
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadAppConfig(): AppConfig {
  return {
    apiBaseUrl: readString(ENV.apiBaseUrl) ?? DEFAULT_BASE_URL,
    apiTimeoutMs: readNumber(ENV.apiTimeoutMs, DEFAULT_TIMEOUT_MS),
    // The in-app mock backend is a development affordance: it defaults ON in a
    // development build and OFF in a release build. An explicit
    // `EXPO_PUBLIC_MOCK_API=true` still wins, so a release demo can opt in
    // deliberately rather than accidentally.
    mockApiEnabled: readBool(ENV.mockApi, IS_DEVELOPMENT_RUNTIME),
    mockLatencyMs: readNumber(ENV.mockLatencyMs, DEFAULT_LATENCY_MS),
    mockErrorsEnabled: readBool(ENV.mockErrors, false),
    isDevelopmentRuntime: IS_DEVELOPMENT_RUNTIME,
  };
}
