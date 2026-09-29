import type { ISecureStorage } from '@/core/interfaces/ISecureStorage';

/**
 * Web implementation of `ISecureStorage`.
 *
 * `expo-secure-store` has no web support, so Metro resolves this file for the
 * web platform and the session is kept in `localStorage` (with an in-memory
 * fallback when storage is blocked, e.g. private browsing).
 */
export class SecureStoreStorage implements ISecureStorage {
  private readonly fallback = new Map<string, string>();

  private get webStorage(): Storage | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage;
    } catch {
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const storage = this.webStorage;
    if (storage) {
      return storage.getItem(key);
    }
    return this.fallback.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    const storage = this.webStorage;
    if (storage) {
      storage.setItem(key, value);
      return;
    }
    this.fallback.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    const storage = this.webStorage;
    if (storage) {
      storage.removeItem(key);
      return;
    }
    this.fallback.delete(key);
  }
}
