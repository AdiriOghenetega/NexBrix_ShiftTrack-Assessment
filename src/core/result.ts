/**
 * Explicit result type used by every use case.
 *
 * Expecting a `Result<T>` instead of catching exceptions makes the failure
 * paths part of the type signature, so the presentation layer is forced to
 * handle them.
 */

import type { AppError } from './errors';

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err {
  readonly ok: false;
  readonly error: AppError;
}

export type Result<T> = Ok<T> | Err;

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(error: AppError): Result<T> {
  return { ok: false, error };
}

export function isOk<T>(result: Result<T>): result is Ok<T> {
  return result.ok;
}

export function isErr<T>(result: Result<T>): result is Err {
  return !result.ok;
}
