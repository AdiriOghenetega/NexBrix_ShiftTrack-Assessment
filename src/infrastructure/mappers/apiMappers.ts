/**
 * DTO -> domain mappers with light runtime validation.
 *
 * The mock layer and a real backend can both drift from the contract, so every
 * payload is validated at the boundary instead of being blindly cast.
 */

import type { Shift } from '@/core/entities/Shift';
import { isUserRole, type AuthSession, type User } from '@/core/entities/User';
import { AppError } from '@/core/errors';

const MALFORMED = 'The server returned an unexpected response.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AppError('SERVER', MALFORMED);
  }
  return value;
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError('SERVER', MALFORMED);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function requireFiniteNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError('SERVER', MALFORMED);
  }
  return value;
}

export function mapUserDto(value: unknown): User {
  const record = requireRecord(value);
  const role = record.role;
  if (!isUserRole(role)) {
    throw new AppError('SERVER', MALFORMED);
  }
  return {
    id: requireString(record, 'id'),
    email: requireString(record, 'email'),
    name: requireString(record, 'name'),
    role,
  };
}

export function mapShiftDto(value: unknown): Shift {
  const record = requireRecord(value);
  const startTime = requireString(record, 'startTime');
  if (Number.isNaN(Date.parse(startTime))) {
    throw new AppError('SERVER', MALFORMED);
  }

  const rawEndTime = record.endTime;
  const endTime = typeof rawEndTime === 'string' ? rawEndTime : null;
  if (endTime !== null && Number.isNaN(Date.parse(endTime))) {
    throw new AppError('SERVER', MALFORMED);
  }

  return {
    id: requireString(record, 'id'),
    userId: requireString(record, 'userId'),
    startTime,
    endTime,
    breakMinutes: Math.max(0, Math.round(requireFiniteNumber(record, 'breakMinutes'))),
    note: optionalString(record, 'note'),
    createdAt: optionalString(record, 'createdAt') ?? startTime,
    updatedAt: optionalString(record, 'updatedAt') ?? startTime,
  };
}

export function mapShiftListResponse(value: unknown): Shift[] {
  const record = requireRecord(value);
  const shifts = record.shifts;
  if (!Array.isArray(shifts)) {
    throw new AppError('SERVER', MALFORMED);
  }
  return shifts.map(mapShiftDto);
}

export function mapShiftResponse(value: unknown): Shift {
  const record = requireRecord(value);
  return mapShiftDto(record.shift);
}

export function mapLoginResponse(value: unknown): AuthSession {
  const record = requireRecord(value);
  const token = requireString(record, 'token');
  const issuedAt = optionalString(record, 'issuedAt') ?? new Date().toISOString();
  return { token, issuedAt, user: mapUserDto(record.user) };
}

/**
 * Validates a session that was decoded from secure storage. Returns `null`
 * when the stored blob is corrupt so the caller can clear it and re-authenticate.
 */
export function parseStoredSession(value: unknown): AuthSession | null {
  try {
    const record = requireRecord(value);
    const token = record.token;
    if (typeof token !== 'string' || token.length === 0) {
      return null;
    }
    const issuedAt = typeof record.issuedAt === 'string' ? record.issuedAt : new Date().toISOString();
    return { token, issuedAt, user: mapUserDto(record.user) };
  } catch {
    return null;
  }
}
