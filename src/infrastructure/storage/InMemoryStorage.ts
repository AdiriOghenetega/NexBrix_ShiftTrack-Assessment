import type { ISecureStorage } from '@/core/interfaces/ISecureStorage';

/** Volatile `ISecureStorage` used by unit tests and as a last-resort fallback. */
export class InMemoryStorage implements ISecureStorage {
  private readonly entries = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.entries.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.entries.delete(key);
  }

  /** Exposed so tests can inspect what was written. */
  snapshot(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.entries);
  }
}

export function createInMemoryStorage(): InMemoryStorage {
  return new InMemoryStorage();
}
