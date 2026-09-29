import { toAppError } from '../errors';
import type { IAuthRepository } from '../interfaces/IAuthRepository';
import { fail, ok, type Result } from '../result';

/** Clears the encrypted session so the user is signed out for good. */
export class SignOutUser {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(): Promise<Result<void>> {
    try {
      await this.authRepository.clearSession();
      return ok(undefined);
    } catch (error) {
      return fail(toAppError(error, 'Unable to sign out. Please try again.'));
    }
  }
}
