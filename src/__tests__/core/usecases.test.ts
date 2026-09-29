import { AppError } from '@/core/errors';
import { AuthenticateUser } from '@/core/usecases/AuthenticateUser';
import { CreateShift } from '@/core/usecases/CreateShift';
import { EndShift } from '@/core/usecases/EndShift';
import { GetWeeklyShifts } from '@/core/usecases/GetWeeklyShifts';
import { RestoreSession } from '@/core/usecases/RestoreSession';
import { SignOutUser } from '@/core/usecases/SignOutUser';
import { StartShift } from '@/core/usecases/StartShift';
import { END_BEFORE_START_MESSAGE } from '@/core/validation/shiftValidation';
import { combineDateKeyAndTime, formatClockTime, toEpochMs } from '@/core/utils/time';

import { FakeAuthRepository, FakeShiftRepository, createTestSession } from '../helpers/fakes';

describe('AuthenticateUser', () => {
  it('persists the issued session and returns it', async () => {
    const repository = new FakeAuthRepository();
    const useCase = new AuthenticateUser(repository);

    const result = await useCase.execute({ email: 'staff@shifttrack.test', password: 'Password123' });

    expect(result.ok).toBe(true);
    expect(repository.signInCalls).toBe(1);
    expect(repository.persistSessionCalls).toBe(1);
    expect(repository.persisted?.token).toBe('test-token');
    if (result.ok) {
      expect(result.value.user.email).toBe('staff@shifttrack.test');
    }
  });

  it('rejects a malformed email without touching the repository', async () => {
    const repository = new FakeAuthRepository();
    const useCase = new AuthenticateUser(repository);

    const result = await useCase.execute({ email: 'not-an-email', password: 'Password123' });

    expect(result.ok).toBe(false);
    expect(repository.signInCalls).toBe(0);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.fieldErrors?.email).toBeDefined();
    }
  });

  it('rejects a short password without touching the repository', async () => {
    const repository = new FakeAuthRepository();
    const useCase = new AuthenticateUser(repository);

    const result = await useCase.execute({ email: 'staff@shifttrack.test', password: '123' });

    expect(result.ok).toBe(false);
    expect(repository.signInCalls).toBe(0);
    if (!result.ok) {
      expect(result.error.fieldErrors?.password).toBeDefined();
    }
  });

  it('surfaces a 401 and never persists a session', async () => {
    const repository = new FakeAuthRepository({ signInError: new AppError('UNAUTHORIZED', 'Incorrect email or password.') });
    const useCase = new AuthenticateUser(repository);

    const result = await useCase.execute({ email: 'staff@shifttrack.test', password: 'WrongPassword' });

    expect(result.ok).toBe(false);
    expect(repository.persistSessionCalls).toBe(0);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('normalises unexpected failures to an AppError', async () => {
    const repository = new FakeAuthRepository({ signInError: new Error('boom') });
    const useCase = new AuthenticateUser(repository);

    const result = await useCase.execute({ email: 'staff@shifttrack.test', password: 'Password123' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('boom');
    }
  });
});

describe('RestoreSession + SignOutUser', () => {
  it('returns the persisted session after a simulated restart', async () => {
    const repository = new FakeAuthRepository();
    await repository.persistSession(createTestSession());

    const result = await new RestoreSession(repository).execute();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.user.id).toBe('usr_staff_001');
    }
  });

  it('returns ok(null) when there is nothing stored', async () => {
    const result = await new RestoreSession(new FakeAuthRepository()).execute();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it('clears the session on sign out', async () => {
    const repository = new FakeAuthRepository();
    await repository.persistSession(createTestSession());

    const result = await new SignOutUser(repository).execute();

    expect(result.ok).toBe(true);
    expect(repository.clearSessionCalls).toBe(1);
    expect(repository.persisted).toBeNull();
  });
});

describe('GetWeeklyShifts', () => {
  it('rejects an invalid week key before hitting the repository', async () => {
    const repository = new FakeShiftRepository();
    const result = await new GetWeeklyShifts(repository).execute({ weekStartDateKey: '29-09-2026' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('sorts the returned shifts chronologically', async () => {
    const repository = new FakeShiftRepository();
    await repository.createShift({
      startTime: combineDateKeyAndTime('2026-09-29', '13:00'),
      endTime: combineDateKeyAndTime('2026-09-29', '17:00'),
      breakMinutes: 0,
    });
    await repository.createShift({
      startTime: combineDateKeyAndTime('2026-09-29', '08:00'),
      endTime: combineDateKeyAndTime('2026-09-29', '12:00'),
      breakMinutes: 0,
    });

    const result = await new GetWeeklyShifts(repository).execute({ weekStartDateKey: '2026-09-28' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((shift) => formatClockTime(shift.startTime))).toEqual(['08:00', '13:00']);
      expect(result.value.map((shift) => toEpochMs(shift.startTime))).toStrictEqual(
        [...result.value.map((shift) => toEpochMs(shift.startTime))].sort((a, b) => a - b),
      );
    }
  });

  it('wraps repository failures in a friendly AppError', async () => {
    const repository = new FakeShiftRepository({ listError: new Error('network down') });
    const result = await new GetWeeklyShifts(repository).execute({ weekStartDateKey: '2026-09-28' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('network down');
    }
  });
});

describe('CreateShift', () => {
  const startTime = combineDateKeyAndTime('2026-09-29', '09:00');
  const endTime = combineDateKeyAndTime('2026-09-29', '17:00');

  it('rejects an end time before the start time', async () => {
    const repository = new FakeShiftRepository();
    const result = await new CreateShift(repository).execute({ startTime: endTime, endTime: startTime, breakMinutes: 0 });

    expect(result.ok).toBe(false);
    expect(repository.createCalls).toBe(0);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.fieldErrors?.endTime).toBe(END_BEFORE_START_MESSAGE);
    }
  });

  it('rejects a negative break', async () => {
    const repository = new FakeShiftRepository();
    const result = await new CreateShift(repository).execute({ startTime, endTime, breakMinutes: -30 });

    expect(result.ok).toBe(false);
    expect(repository.createCalls).toBe(0);
    if (!result.ok) {
      expect(result.error.fieldErrors?.breakMinutes).toBeDefined();
    }
  });

  it('creates a valid shift and trims the note', async () => {
    const repository = new FakeShiftRepository();
    const result = await new CreateShift(repository).execute({
      startTime,
      endTime,
      breakMinutes: 30,
      note: '  Front desk  ',
    });

    expect(result.ok).toBe(true);
    expect(repository.createCalls).toBe(1);
    expect(repository.lastCreateInput?.note).toBe('Front desk');
  });

  it('stores an empty note as null', async () => {
    const repository = new FakeShiftRepository();
    await new CreateShift(repository).execute({ startTime, endTime, breakMinutes: 0, note: '   ' });

    expect(repository.lastCreateInput?.note).toBeNull();
  });
});

describe('StartShift / EndShift', () => {
  const now = new Date('2026-09-29T09:00:00.000Z');

  it('starts an open shift stamped with the injected clock', async () => {
    const repository = new FakeShiftRepository();
    const result = await new StartShift(repository).execute({ breakMinutes: 15, now });

    expect(result.ok).toBe(true);
    expect(repository.lastCreateInput?.endTime).toBeNull();
    expect(repository.lastCreateInput?.startTime).toBe(now.toISOString());
  });

  it('refuses to start a second concurrent shift', async () => {
    const repository = new FakeShiftRepository();
    await new StartShift(repository).execute({ now });

    const result = await new StartShift(repository).execute({ now });

    expect(result.ok).toBe(false);
    expect(repository.createCalls).toBe(1);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('ends a running shift by patching the end time', async () => {
    const repository = new FakeShiftRepository();
    const started = await new StartShift(repository).execute({ now });
    expect(started.ok).toBe(true);

    const endAt = new Date('2026-09-29T17:00:00.000Z');
    const result = await new EndShift(repository).execute({
      shiftId: started.ok ? started.value.id : '',
      endTime: endAt.toISOString(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.endTime).toBe(endAt.toISOString());
    }
    expect(repository.updateCalls).toHaveLength(1);
  });

  it('rejects ending a shift with a time before its start', async () => {
    const repository = new FakeShiftRepository();
    const started = await new StartShift(repository).execute({ now });
    const shiftId = started.ok ? started.value.id : '';

    const result = await new EndShift(repository).execute({
      shiftId,
      startTime: now.toISOString(),
      endTime: new Date('2026-09-29T08:59:00.000Z').toISOString(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.fieldErrors?.endTime).toBe(END_BEFORE_START_MESSAGE);
    }
  });

  it('requires a shift id', async () => {
    const repository = new FakeShiftRepository();
    const result = await new EndShift(repository).execute({ shiftId: '   ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });
});
