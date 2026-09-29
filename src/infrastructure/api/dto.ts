/** Wire-format (transport) shapes. Kept separate from the domain entities. */

export interface UserDto {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
}

export interface LoginResponseDto {
  readonly token: string;
  readonly issuedAt: string;
  readonly user: UserDto;
}

export interface ShiftDto {
  readonly id: string;
  readonly userId: string;
  readonly startTime: string;
  readonly endTime: string | null;
  readonly breakMinutes: number;
  readonly note: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ShiftListResponseDto {
  readonly shifts: ShiftDto[];
}

export interface ShiftResponseDto {
  readonly shift: ShiftDto;
}

export interface ApiErrorBodyDto {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Record<string, string>;
  };
}
