import type { AuthSession } from '../entities/User';
import { AppError, toAppError } from '../errors';
import type { IAuthRepository } from '../interfaces/IAuthRepository';
import { fail, ok, type Result } from '../result';
import { getEmailError, getPasswordError } from '../validation/shiftValidation';

export interface AuthenticateUserRequest {
  readonly email: string;
  readonly password: string;
}

/**
 * Business rule: a user can only be signed in with a well-formed email and a
 * non-empty password, and the issued session must then be persisted securely
 * so it survives an app restart.
 */
export class AuthenticateUser {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(request: AuthenticateUserRequest): Promise<Result<AuthSession>> {
    const email = request.email.trim();
    const { password } = request;

    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);
    if (emailError || passwordError) {
      const fieldErrors: Record<string, string> = {};
      if (emailError) {
        fieldErrors.email = emailError;
      }
      if (passwordError) {
        fieldErrors.password = passwordError;
      }
      return fail(new AppError('VALIDATION', 'Please check your credentials and try again.', { fieldErrors }));
    }

    try {
      const session = await this.authRepository.signIn({ email, password });
      await this.authRepository.persistSession(session);
      return ok(session);
    } catch (error) {
      return fail(toAppError(error, 'Unable to sign in. Please try again.'));
    }
  }
}
