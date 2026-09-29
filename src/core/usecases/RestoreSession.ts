import type { AuthSession } from '../entities/User';
import { toAppError } from '../errors';
import type { IAuthRepository } from '../interfaces/IAuthRepository';
import { fail, ok, type Result } from '../result';

/**
 * Restores the encrypted session on cold start.
 *
 * Returns `ok(null)` — not an error — when there is no stored session, so the
 * caller can simply route to the login screen.
 */
export class RestoreSession {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(): Promise<Result<AuthSession | null>> {
    try {
      const session = await this.authRepository.getPersistedSession();
      return ok(session);
    } catch (error) {
      return fail(toAppError(error, 'Unable to restore your session.'));
    }
  }
}
