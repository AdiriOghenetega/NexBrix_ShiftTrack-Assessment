/**
 * `fetch`-based HTTP client with a pluggable mock transport.
 *
 * Both transports return the exact same `HttpResponse` shape, so status-code
 * mapping (401 -> UNAUTHORIZED, 400 -> VALIDATION, ...) is applied identically
 * whether the request was served by the mock server or by a real backend.
 * Simulated *network* failures bypass the status mapping and surface as
 * `NETWORK` errors, which is what the retry UI reacts to.
 */

import type { AppErrorCode } from '@/core/errors';
import { AppError, isAppError } from '@/core/errors';
import type { HttpRequest, HttpResponse, IHttpClient } from '@/core/interfaces/IHttpClient';

import type { ApiErrorBodyDto } from './dto';
import { Endpoints } from './endpoints';
import { mockServer } from './mockServer';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface FetchHttpClientOptions {
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  /** Resolves the bearer token for authenticated calls. */
  readonly getAccessToken?: () => Promise<string | null>;
  /**
   * `true` routes requests through the in-app mock layer. Defaults to `false`,
   * so a client constructed without explicit configuration talks to the real
   * network instead of silently serving mocked data.
   */
  readonly useMockApi?: boolean;
  readonly fetchImpl?: typeof fetch;
}

const STATUS_CODES: Readonly<Record<number, AppErrorCode>> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
};

const KNOWN_CODES: readonly AppErrorCode[] = [
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'NETWORK',
  'SERVER',
  'UNKNOWN',
];

function defaultCodeForStatus(status: number): AppErrorCode {
  if (status >= 500) {
    return 'SERVER';
  }
  return STATUS_CODES[status] ?? 'UNKNOWN';
}

function defaultMessageForStatus(status: number): string {
  if (status >= 500) {
    return 'ShiftTrack had a problem on its side. Please retry.';
  }
  if (status === 404) {
    return 'We could not find what you were looking for.';
  }
  if (status === 409) {
    return 'That action conflicts with the current state.';
  }
  if (status === 401 || status === 403) {
    return 'You are not authorised to do that.';
  }
  if (status >= 400) {
    return 'The request was rejected. Please check your input.';
  }
  return 'Something went wrong. Please try again.';
}

function isAppErrorCode(value: string): value is AppErrorCode {
  return (KNOWN_CODES as readonly string[]).includes(value);
}

function extractErrorBody(payload: unknown): ApiErrorBodyDto['error'] | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const record = error as { code?: unknown; message?: unknown; fieldErrors?: unknown };
  if (typeof record.code !== 'string' && typeof record.message !== 'string') {
    return null;
  }
  const fieldErrors =
    typeof record.fieldErrors === 'object' && record.fieldErrors !== null
      ? (record.fieldErrors as Record<string, string>)
      : undefined;
  return {
    code: typeof record.code === 'string' ? record.code : 'UNKNOWN',
    message: typeof record.message === 'string' ? record.message : 'Something went wrong.',
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

/** Maps an HTTP error status/payload onto a domain `AppError`. */
export function httpStatusToError(status: number, payload: unknown): AppError {
  const body = extractErrorBody(payload);
  const code = body && isAppErrorCode(body.code) ? body.code : defaultCodeForStatus(status);
  const message = body?.message ?? defaultMessageForStatus(status);
  return new AppError(code, message, body?.fieldErrors ? { fieldErrors: body.fieldErrors } : {});
}

function normalizeTransportError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    const name = (error as { name?: unknown }).name;
    if (name === 'AbortError') {
      return new AppError('NETWORK', 'The request timed out. Check your connection and retry.');
    }
  }
  return new AppError('NETWORK', 'Cannot reach ShiftTrack. Check your connection and retry.');
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class FetchHttpClient implements IHttpClient {
  private readonly baseUrl: string;

  private readonly timeoutMs: number;

  private readonly getAccessToken?: () => Promise<string | null>;

  private readonly useMockApi: boolean;

  /**
   * Invoked when an authenticated request is rejected with `401`, so the app can
   * clear the session and return to sign-in instead of looping on failures.
   * Assigned by the composition root (`createAppContainer`) to keep the
   * dependency arrow pointing inward.
   */
  onUnauthorized: (() => void) | null = null;

  private readonly fetchImpl: typeof fetch;

  constructor(options: FetchHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.getAccessToken = options.getAccessToken;
    this.useMockApi = options.useMockApi ?? false;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    try {
      const headers = await this.buildHeaders(request);
      const prepared: HttpRequest = { ...request, headers };
      const response: HttpResponse<unknown> = this.useMockApi
        ? await mockServer.handle(prepared)
        : await this.sendOverNetwork(prepared);
      return this.assertSuccess<T>(response, request.path);
    } catch (error) {
      throw normalizeTransportError(error);
    }
  }

  private async buildHeaders(request: HttpRequest): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(request.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(request.headers ?? {}),
    };

    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async sendOverNetwork(request: HttpRequest): Promise<HttpResponse<unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${request.path}`, {
        method: request.method,
        headers: request.headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: request.signal ?? controller.signal,
      });
      const data = await parseJsonBody(response);
      return { status: response.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  private assertSuccess<T>(response: HttpResponse<unknown>, path: string): HttpResponse<T> {
    if (response.status >= 200 && response.status < 300) {
      return { status: response.status, data: response.data as T };
    }

    // A rejected session must sign the user out rather than trap them in a retry
    // loop. The login route is excluded so a wrong password does not trigger a
    // spurious sign-out of an existing session.
    if (response.status === 401 && path !== Endpoints.login) {
      this.notifyUnauthorized();
    }

    throw httpStatusToError(response.status, response.data);
  }

  private notifyUnauthorized(): void {
    const handler = this.onUnauthorized;
    if (!handler) {
      return;
    }
    try {
      handler();
    } catch {
      // Session recovery must never mask the original request failure.
    }
  }
}
