import type { AuthSession } from '@/core/entities/User';
import type { IAuthRepository, SignInCredentials } from '@/core/interfaces/IAuthRepository';
import type { IHttpClient } from '@/core/interfaces/IHttpClient';
import type { ISecureStorage } from '@/core/interfaces/ISecureStorage';

import type { LoginResponseDto } from '../api/dto';
import { Endpoints } from '../api/endpoints';
import { mapLoginResponse, parseStoredSession } from '../mappers/apiMappers';
import { ACCESS_TOKEN_STORAGE_KEY, SESSION_STORAGE_KEY } from '../storage/storageKeys';

/**
 * Authentication repository.
 *
 * Combines the `/auth/login` exchange with encrypted persistence so that the
 * session survives an app restart. The token is deliberately duplicated into
 * its own secure key: reading it for `Authorization` headers then costs one
 * keychain read instead of a JSON parse on every request.
 */
export class AuthRepository implements IAuthRepository {
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly storage: ISecureStorage,
  ) {}

  async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    const response = await this.httpClient.request<LoginResponseDto>({
      method: 'POST',
      path: Endpoints.login,
      body: { email: credentials.email, password: credentials.password },
    });
    return mapLoginResponse(response.data);
  }

  async persistSession(session: AuthSession): Promise<void> {
    await Promise.all([
      this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)),
      this.storage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.token),
    ]);
  }

  async getPersistedSession(): Promise<AuthSession | null> {
    const raw = await this.storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw) as unknown;
    } catch {
      await this.clearSession();
      return null;
    }

    const session = parseStoredSession(decoded);
    if (!session) {
      // Corrupt or legacy payload: drop it so the user is asked to sign in again.
      await this.clearSession();
      return null;
    }

    // The token is stored twice (inside the session blob and under its own key)
    // so that header reads stay cheap. Repair the pair on read: a partially
    // written session must never present as "signed in" while every request
    // goes out without a valid bearer token.
    const storedToken = await this.storage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (storedToken !== session.token) {
      try {
        await this.storage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.token);
      } catch {
        // Cannot guarantee the pair; require a fresh sign-in instead.
        await this.clearSession();
        return null;
      }
    }

    return session;
  }

  async clearSession(): Promise<void> {
    await Promise.all([
      this.storage.removeItem(SESSION_STORAGE_KEY),
      this.storage.removeItem(ACCESS_TOKEN_STORAGE_KEY),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    return this.storage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}
