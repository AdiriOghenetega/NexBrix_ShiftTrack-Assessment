/**
 * Hand-rolled test doubles for the repository ports.
 *
 * Kept dependency-free (no mocking library) so the use case tests exercise the
 * real business rules with fully typed collaborators.
 */

import type { CreateShiftInput, Shift, UpdateShiftInput } from '@/core/entities/Shift';
import type { AuthSession, User } from '@/core/entities/User';
import { AppError } from '@/core/errors';
import type { IAuthRepository, SignInCredentials } from '@/core/interfaces/IAuthRepository';
import type { IShiftRepository } from '@/core/interfaces/IShiftRepository';

export const TEST_USER: User = {
  id: 'usr_staff_001',
  email: 'staff@shifttrack.test',
  name: 'Alex Mercer',
  role: 'staff',
};

export function createTestSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    token: 'test-token',
    issuedAt: '2026-09-29T08:00:00.000Z',
    user: TEST_USER,
    ...overrides,
  };
}

export interface FakeAuthRepositoryOptions {
  readonly session?: AuthSession;
  readonly signInError?: Error;
}

export class FakeAuthRepository implements IAuthRepository {
  persisted: AuthSession | null = null;

  signInCalls = 0;

  persistSessionCalls = 0;

  clearSessionCalls = 0;

  private readonly session: AuthSession;

  private readonly signInError: Error | undefined;

  constructor(options: FakeAuthRepositoryOptions = {}) {
    this.session = options.session ?? createTestSession();
    this.signInError = options.signInError;
  }

  async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    this.signInCalls += 1;
    if (this.signInError) {
      throw this.signInError;
    }
    if (credentials.email.toLowerCase() !== this.session.user.email.toLowerCase()) {
      throw new AppError('UNAUTHORIZED', 'Incorrect email or password.');
    }
    if (credentials.password.length === 0) {
      throw new AppError('UNAUTHORIZED', 'Incorrect email or password.');
    }
    return this.session;
  }

  async persistSession(session: AuthSession): Promise<void> {
    this.persistSessionCalls += 1;
    this.persisted = session;
  }

  async getPersistedSession(): Promise<AuthSession | null> {
    return this.persisted;
  }

  async clearSession(): Promise<void> {
    this.clearSessionCalls += 1;
    this.persisted = null;
  }

  async getAccessToken(): Promise<string | null> {
    return this.persisted?.token ?? null;
  }
}

export interface FakeShiftRepositoryOptions {
  readonly listError?: Error;
  readonly activeShiftId?: string;
}

export class FakeShiftRepository implements IShiftRepository {
  shifts: Shift[] = [];

  createCalls = 0;

  updateCalls: string[] = [];

  deleteCalls: string[] = [];

  activeLookups = 0;

  lastCreateInput: CreateShiftInput | null = null;

  lastUpdateInput: UpdateShiftInput | null = null;

  private readonly listError: Error | undefined;

  private sequence = 0;

  constructor(options: FakeShiftRepositoryOptions = {}) {
    this.listError = options.listError;
  }

  async getShiftsByWeek(): Promise<Shift[]> {
    if (this.listError) {
      throw this.listError;
    }
    return [...this.shifts];
  }

  async getActiveShift(): Promise<Shift | null> {
    this.activeLookups += 1;
    return this.shifts.find((shift) => shift.endTime === null) ?? null;
  }

  async getShiftById(shiftId: string): Promise<Shift> {
    const shift = this.shifts.find((candidate) => candidate.id === shiftId);
    if (!shift) {
      throw new AppError('NOT_FOUND', 'That shift could not be found.');
    }
    return shift;
  }

  async createShift(input: CreateShiftInput): Promise<Shift> {
    this.createCalls += 1;
    this.lastCreateInput = input;
    this.sequence += 1;
    const now = new Date().toISOString();
    const shift: Shift = {
      id: `shift_fake_${this.sequence}`,
      userId: TEST_USER.id,
      startTime: input.startTime,
      endTime: input.endTime,
      breakMinutes: input.breakMinutes,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.shifts.push(shift);
    return shift;
  }

  async updateShift(shiftId: string, input: UpdateShiftInput): Promise<Shift> {
    this.updateCalls.push(shiftId);
    this.lastUpdateInput = input;

    const index = this.shifts.findIndex((shift) => shift.id === shiftId);
    const existing = this.shifts[index];
    if (index < 0 || !existing) {
      throw new AppError('NOT_FOUND', 'That shift could not be found.');
    }

    const updated: Shift = {
      ...existing,
      endTime: input.endTime === undefined ? existing.endTime : input.endTime,
      breakMinutes: input.breakMinutes === undefined ? existing.breakMinutes : input.breakMinutes,
      note: input.note === undefined ? existing.note : input.note,
      updatedAt: new Date().toISOString(),
    };
    this.shifts[index] = updated;
    return updated;
  }

  async deleteShift(shiftId: string): Promise<void> {
    this.deleteCalls.push(shiftId);
    const index = this.shifts.findIndex((shift) => shift.id === shiftId);
    if (index < 0) {
      throw new AppError('NOT_FOUND', 'That shift could not be found.');
    }
    this.shifts.splice(index, 1);
  }
}
