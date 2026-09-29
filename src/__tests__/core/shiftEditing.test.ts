/**
 * Edit / delete shifts — new use cases plus the mock API routes they rely on.
 */
import { combineDateKeyAndTime } from '@/core/utils/time';
import { DeleteShift } from '@/core/usecases/DeleteShift';
import { GetShiftById } from '@/core/usecases/GetShiftById';
import { UpdateShift } from '@/core/usecases/UpdateShift';
import { END_BEFORE_START_MESSAGE } from '@/core/validation/shiftValidation';
import { DEMO_CREDENTIALS } from '@/infrastructure/api/mockDatabase';
import { mockServer } from '@/infrastructure/api/mockServer';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import { createAppContainer, type AppContainer } from '@/infrastructure/container';
import { createInMemoryStorage } from '@/infrastructure/storage/InMemoryStorage';

import { FakeShiftRepository } from '../helpers/fakes';

const config: AppConfig = {
  apiBaseUrl: 'https://api.shifttrack.test',
  apiTimeoutMs: 5_000,
  mockApiEnabled: true,
  mockLatencyMs: 0,
  mockErrorsEnabled: false,
};

const START = combineDateKeyAndTime('2026-09-28', '09:00');
const END = combineDateKeyAndTime('2026-09-28', '17:00');

function createEditingContainer(): AppContainer {
  return createAppContainer({ storage: createInMemoryStorage(), config });
}

async function signInAs(container: AppContainer, email: string): Promise<void> {
  const result = await container.authenticateUser.execute({
    email,
    password: DEMO_CREDENTIALS.password,
  });
  expect(result.ok).toBe(true);
}

/** Creates one completed shift for the signed-in user and returns its id. */
async function seedShift(container: AppContainer): Promise<string> {
  const created = await container.createShift.execute({
    startTime: START,
    endTime: END,
    breakMinutes: 30,
    note: 'Original',
  });
  expect(created.ok).toBe(true);
  return created.ok ? created.value.id : '';
}

beforeEach(() => {
  mockServer.resetConfig();
  mockServer.configure({ latencyMs: 0, alwaysFail: false, failureRate: 0 });
  mockServer.resetDatabase();
});

describe('UpdateShift use case', () => {
  it('requires a shift id', async () => {
    const result = await new UpdateShift(new FakeShiftRepository()).execute({
      shiftId: '   ',
      startTime: START,
      endTime: END,
      breakMinutes: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('enforces the same end-after-start rule as creation', async () => {
    const repository = new FakeShiftRepository();
    const result = await new UpdateShift(repository).execute({
      shiftId: 'shift_1',
      startTime: END,
      endTime: START,
      breakMinutes: 0,
    });

    expect(result.ok).toBe(false);
    expect(repository.updateCalls).toHaveLength(0);
    if (!result.ok) {
      expect(result.error.fieldErrors?.endTime).toBe(END_BEFORE_START_MESSAGE);
    }
  });

  it('rejects an out-of-range break', async () => {
    const repository = new FakeShiftRepository();
    const result = await new UpdateShift(repository).execute({
      shiftId: 'shift_1',
      startTime: START,
      endTime: END,
      breakMinutes: -5,
    });

    expect(result.ok).toBe(false);
    expect(repository.updateCalls).toHaveLength(0);
  });

  it('saves the full edit, including the start time', async () => {
    const repository = new FakeShiftRepository();
    await repository.createShift({ startTime: START, endTime: END, breakMinutes: 0 });
    const shiftId = repository.shifts[0]?.id ?? '';

    const result = await new UpdateShift(repository).execute({
      shiftId,
      startTime: combineDateKeyAndTime('2026-09-28', '08:00'),
      endTime: END,
      breakMinutes: 45,
      note: '  Adjusted  ',
    });

    expect(result.ok).toBe(true);
    expect(repository.updateCalls).toEqual([shiftId]);
    expect(repository.lastUpdateInput?.startTime).toBe(
      combineDateKeyAndTime('2026-09-28', '08:00'),
    );
    expect(repository.lastUpdateInput?.breakMinutes).toBe(45);
    expect(repository.lastUpdateInput?.note).toBe('Adjusted');
  });
});

describe('DeleteShift use case', () => {
  it('requires a shift id', async () => {
    const result = await new DeleteShift(new FakeShiftRepository()).execute({ shiftId: '' });
    expect(result.ok).toBe(false);
  });

  it('removes the shift', async () => {
    const repository = new FakeShiftRepository();
    await repository.createShift({ startTime: START, endTime: END, breakMinutes: 0 });
    const shiftId = repository.shifts[0]?.id ?? '';

    const result = await new DeleteShift(repository).execute({ shiftId });

    expect(result.ok).toBe(true);
    expect(repository.deleteCalls).toEqual([shiftId]);
    expect(repository.shifts).toHaveLength(0);
  });

  it('reports a missing shift as a failure', async () => {
    const result = await new DeleteShift(new FakeShiftRepository()).execute({
      shiftId: 'shift_missing',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});

describe('GetShiftById use case', () => {
  it('requires a shift id', async () => {
    const result = await new GetShiftById(new FakeShiftRepository()).execute({ shiftId: ' ' });
    expect(result.ok).toBe(false);
  });

  it('returns the stored shift', async () => {
    const repository = new FakeShiftRepository();
    await repository.createShift({ startTime: START, endTime: END, breakMinutes: 15 });
    const shiftId = repository.shifts[0]?.id ?? '';

    const result = await new GetShiftById(repository).execute({ shiftId });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(shiftId);
      expect(result.value.breakMinutes).toBe(15);
    }
  });
});

describe('edit / delete through the container and mock API', () => {
  it('reads a shift back by id', async () => {
    const container = createEditingContainer();
    await signInAs(container, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(container);

    const result = await container.getShiftById.execute({ shiftId });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.note).toBe('Original');
      expect(result.value.startTime).toBe(START);
    }
  });

  it('404s for an unknown shift', async () => {
    const container = createEditingContainer();
    await signInAs(container, DEMO_CREDENTIALS.email);

    const result = await container.getShiftById.execute({ shiftId: 'shift_nope' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('does not leak another user\'s shift', async () => {
    const staff = createEditingContainer();
    await signInAs(staff, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(staff);

    const manager = createEditingContainer();
    await signInAs(manager, 'manager@shifttrack.test');

    const read = await manager.getShiftById.execute({ shiftId });
    expect(read.ok).toBe(false);
    const removed = await manager.deleteShift.execute({ shiftId });
    expect(removed.ok).toBe(false);

    // The staff member's shift is untouched.
    expect((await staff.getShiftById.execute({ shiftId })).ok).toBe(true);
  });

  it('saves an edit and reflects it in the week', async () => {
    const container = createEditingContainer();
    await signInAs(container, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(container);

    const newStart = combineDateKeyAndTime('2026-09-28', '07:30');
    const newEnd = combineDateKeyAndTime('2026-09-28', '15:30');
    const saved = await container.updateShift.execute({
      shiftId,
      startTime: newStart,
      endTime: newEnd,
      breakMinutes: 45,
      note: 'Edited',
    });

    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.value.startTime).toBe(newStart);
      expect(saved.value.endTime).toBe(newEnd);
      expect(saved.value.breakMinutes).toBe(45);
      expect(saved.value.note).toBe('Edited');
    }

    const week = await container.getWeeklyShifts.execute({ weekStartDateKey: '2026-09-28' });
    const reloaded = week.ok ? week.value.find((shift) => shift.id === shiftId) : undefined;
    expect(reloaded?.breakMinutes).toBe(45);
  });

  it('rejects a patch that shifts the start past the stored end', async () => {
    const container = createEditingContainer();
    await signInAs(container, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(container);

    // Only the start moves, so the server has to validate the resulting pair.
    await expect(
      container.shiftRepository.updateShift(shiftId, {
        startTime: combineDateKeyAndTime('2026-09-28', '18:00'),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });

    const untouched = await container.getShiftById.execute({ shiftId });
    expect(untouched.ok && untouched.value.startTime).toBe(START);
  });

  it('moves a shift earlier without touching the end', async () => {
    const container = createEditingContainer();
    await signInAs(container, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(container);

    const earlier = combineDateKeyAndTime('2026-09-28', '07:00');
    const updated = await container.shiftRepository.updateShift(shiftId, { startTime: earlier });

    expect(updated.startTime).toBe(earlier);
    expect(updated.endTime).toBe(END);
  });

  it('deletes a shift, after which it is gone', async () => {
    const container = createEditingContainer();
    await signInAs(container, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(container);

    const removed = await container.deleteShift.execute({ shiftId });
    expect(removed.ok).toBe(true);

    const after = await container.getShiftById.execute({ shiftId });
    expect(after.ok).toBe(false);

    // Deleting again is a 404, not a crash.
    const again = await container.deleteShift.execute({ shiftId });
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.error.code).toBe('NOT_FOUND');
    }
  });

  it('removes the shift from the week listing', async () => {
    const container = createEditingContainer();
    await signInAs(container, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(container);

    await container.deleteShift.execute({ shiftId });

    const week = await container.getWeeklyShifts.execute({ weekStartDateKey: '2026-09-28' });
    expect(week.ok).toBe(true);
    if (week.ok) {
      expect(week.value.some((shift) => shift.id === shiftId)).toBe(false);
    }
  });

  it('requires authentication to delete', async () => {
    const staff = createEditingContainer();
    await signInAs(staff, DEMO_CREDENTIALS.email);
    const shiftId = await seedShift(staff);

    const anonymous = createEditingContainer();
    const result = await anonymous.deleteShift.execute({ shiftId });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
    }
  });
});
