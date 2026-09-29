import type { ISecureStorage } from '@/core/interfaces/ISecureStorage';
import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore-backed `ISecureStorage` (iOS Keychain / Android Keystore).
 *
 * On the rare platform where SecureStore reports itself unavailable we fall
 * back to an in-memory map so the app still boots instead of crashing.
 */
export class SecureStoreStorage implements ISecureStorage {
  private readonly fallback = new Map<string, string>();

  private availability: Promise<boolean> | null = null;

  private isAvailable(): Promise<boolean> {
    this.availability ??= SecureStore.isAvailableAsync().catch(() => false);
    return this.availability;
  }

  async getItem(key: string): Promise<string | null> {
    if (await this.isAvailable()) {
      return SecureStore.getItemAsync(key);
    }
    return this.fallback.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (await this.isAvailable()) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    this.fallback.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (await this.isAvailable()) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    this.fallback.delete(key);
  }
}
