import { compareShiftsChronologically, isActiveShift, type CreateShiftInput, type Shift, type UpdateShiftInput } from '@/core/entities/Shift';
import type { IHttpClient } from '@/core/interfaces/IHttpClient';
import type { IShiftRepository } from '@/core/interfaces/IShiftRepository';

import { activeShiftWindowWeekStarts } from '../api/activeShiftWindow';
import type { ShiftListResponseDto, ShiftResponseDto } from '../api/dto';
import { Endpoints } from '../api/endpoints';
import { mapShiftListResponse, mapShiftResponse } from '../mappers/apiMappers';

/**
 * Shift repository backed by `GET /shifts`, `POST /shifts` and
 * `PATCH /shifts/:id`.
 */
export class ShiftRepository implements IShiftRepository {
  constructor(private readonly httpClient: IHttpClient) {}

  async getShiftsByWeek(weekStartDateKey: string): Promise<Shift[]> {
    const response = await this.httpClient.request<ShiftListResponseDto>({
      method: 'GET',
      path: `${Endpoints.shifts}?weekStart=${encodeURIComponent(weekStartDateKey)}`,
    });
    return mapShiftListResponse(response.data).sort(compareShiftsChronologically);
  }

  async getActiveShift(): Promise<Shift | null> {
    // The window comes from the shared helper so the client and the API always
    // agree on which open shift counts as "currently running".
    const weeks = activeShiftWindowWeekStarts();

    for (const weekStart of weeks) {
      const shifts = await this.getShiftsByWeek(weekStart);
      const active = shifts.find(isActiveShift);
      if (active) {
        return active;
      }
    }
    return null;
  }

  async getShiftById(shiftId: string): Promise<Shift> {
    const response = await this.httpClient.request<ShiftResponseDto>({
      method: 'GET',
      path: Endpoints.shift(shiftId),
    });
    return mapShiftResponse(response.data);
  }

  async createShift(input: CreateShiftInput): Promise<Shift> {
    const response = await this.httpClient.request<ShiftResponseDto>({
      method: 'POST',
      path: Endpoints.shifts,
      body: {
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes,
        note: input.note ?? null,
      },
    });
    return mapShiftResponse(response.data);
  }

  async updateShift(shiftId: string, input: UpdateShiftInput): Promise<Shift> {
    const response = await this.httpClient.request<ShiftResponseDto>({
      method: 'PATCH',
      path: Endpoints.shift(shiftId),
      body: {
        ...(input.startTime === undefined ? {} : { startTime: input.startTime }),
        ...(input.endTime === undefined ? {} : { endTime: input.endTime }),
        ...(input.breakMinutes === undefined ? {} : { breakMinutes: input.breakMinutes }),
        ...(input.note === undefined ? {} : { note: input.note }),
      },
    });
    return mapShiftResponse(response.data);
  }

  async deleteShift(shiftId: string): Promise<void> {
    // The mock API answers `204 No Content`; the body carries no meaning here.
    await this.httpClient.request<null>({ method: 'DELETE', path: Endpoints.shift(shiftId) });
  }
}
