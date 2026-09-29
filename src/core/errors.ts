/**
 * Domain-level error model.
 *
 * The domain and application layers never throw raw `Error`s across their
 * boundaries. Instead they return `Result` values carrying an `AppError`
 * (see `./result.ts`), which keeps every failure explicit and type-safe.
 */

export type AppErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'NETWORK'
  | 'SERVER'
  | 'UNKNOWN';

export const APP_ERROR_CODE = {
  validation: 'VALIDATION',
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  network: 'NETWORK',
  server: 'SERVER',
  unknown: 'UNKNOWN',
} as const satisfies Record<string, AppErrorCode>;

/** Field name -> human readable message. */
export type FieldErrorMap = Readonly<Record<string, string>>;

export interface AppErrorOptions {
  readonly fieldErrors?: FieldErrorMap;
  readonly originalError?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;

  readonly fieldErrors: FieldErrorMap | undefined;

  readonly originalError: unknown;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.fieldErrors = options.fieldErrors;
    this.originalError = options.originalError;
    // Required so `instanceof AppError` keeps working after transpilation.
    Object.setPrototypeOf(this, AppError.prototype);
  }

  get firstFieldError(): string | undefined {
    if (!this.fieldErrors) {
      return undefined;
    }
    return Object.values(this.fieldErrors)[0];
  }
}

export function isAppError(value: unknown): value is AppError {
  if (value instanceof AppError) {
    return true;
  }
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { name?: unknown; code?: unknown; message?: unknown };
  return candidate.name === 'AppError' && typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

/** Normalizes any thrown value into an `AppError`. */
export function toAppError(value: unknown, fallbackMessage = 'Something went wrong. Please try again.'): AppError {
  if (isAppError(value)) {
    return value;
  }
  if (value instanceof Error && value.message) {
    return new AppError('UNKNOWN', value.message, { originalError: value });
  }
  return new AppError('UNKNOWN', fallbackMessage, { originalError: value });
}

export function validationError(message: string, fieldErrors?: FieldErrorMap): AppError {
  return new AppError('VALIDATION', message, fieldErrors ? { fieldErrors } : {});
}

export function networkError(message = 'No connection. Check your network and retry.'): AppError {
  return new AppError('NETWORK', message);
}

export function unauthorizedError(message = 'Your session expired. Please sign in again.'): AppError {
  return new AppError('UNAUTHORIZED', message);
}
