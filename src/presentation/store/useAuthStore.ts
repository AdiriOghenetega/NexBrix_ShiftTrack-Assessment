import { create } from 'zustand';

import type { User } from '@/core/entities/User';
import { AppError } from '@/core/errors';
import { container } from '@/infrastructure/appContainer';

import { useShiftStore } from './useShiftStore';

export type AuthStatus = 'restoring' | 'signedOut' | 'signingIn' | 'signedIn';

export interface AuthState {
  readonly status: AuthStatus;
  readonly user: User | null;
  readonly error: AppError | null;
  /** Restores the encrypted session on cold start. */
  readonly bootstrap: () => Promise<void>;
  /** Returns `true` on success; the error is exposed through `error`. */
  readonly signIn: (email: string, password: string) => Promise<boolean>;
  readonly signOut: () => Promise<void>;
  /**
   * Clears an expired/invalid session after a `401`, returning the user to the
   * login screen instead of leaving them in a retry loop.
   */
  readonly handleSessionExpired: () => Promise<void>;
  readonly clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'restoring',
  user: null,
  error: null,

  async bootstrap() {
    set({ status: 'restoring', error: null });

    const result = await container.restoreSession.execute();
    if (!result.ok) {
      set({ status: 'signedOut', user: null, error: result.error });
      return;
    }

    const session = result.value;
    set({
      status: session ? 'signedIn' : 'signedOut',
      user: session?.user ?? null,
      error: null,
    });
  },

  async signIn(email, password) {
    set({ status: 'signingIn', error: null });

    const result = await container.authenticateUser.execute({ email, password });
    if (!result.ok) {
      set({ status: 'signedOut', user: null, error: result.error });
      return false;
    }

    set({ status: 'signedIn', user: result.value.user, error: null });
    return true;
  },

  async signOut() {
    const result = await container.signOutUser.execute();
    useShiftStore.getState().reset();

    set({
      status: 'signedOut',
      user: null,
      error: result.ok ? null : result.error,
    });
  },

  async handleSessionExpired() {
    // Only react while a session is actually active, so a failure on the sign-in
    // screen cannot bounce the user back into this handler.
    if (get().status !== 'signedIn') {
      return;
    }

    await container.signOutUser.execute();
    useShiftStore.getState().reset();

    set({
      status: 'signedOut',
      user: null,
      error: new AppError('UNAUTHORIZED', 'Your session expired. Please sign in again.'),
    });
  },

  clearError() {
    set({ error: null });
  },
}));

/** Selector helpers keep component re-renders narrow. */
export const selectIsAuthenticated = (state: AuthState): boolean => state.status === 'signedIn';
export const selectAuthUser = (state: AuthState): User | null => state.user;
export const selectIsSigningIn = (state: AuthState): boolean => state.status === 'signingIn';
export const selectIsRestoring = (state: AuthState): boolean => state.status === 'restoring';
