import type { AuthSession } from '../entities/User';

export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Port: authentication data source.
 *
 * Implementations own both the network call and the secure persistence of the
 * resulting session, which is what makes the session survive an app restart.
 */
export interface IAuthRepository {
  /** Performs the credentials exchange and returns the issued session. */
  signIn(credentials: SignInCredentials): Promise<AuthSession>;
  /** Persists the session in encrypted storage. */
  persistSession(session: AuthSession): Promise<void>;
  /** Reads the previously persisted session, or `null` when absent/corrupt. */
  getPersistedSession(): Promise<AuthSession | null>;
  /** Removes the persisted session (logout). */
  clearSession(): Promise<void>;
  /** Convenience accessor used by authenticated API calls. */
  getAccessToken(): Promise<string | null>;
}
