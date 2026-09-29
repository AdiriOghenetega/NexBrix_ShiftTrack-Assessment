/**
 * Port: encrypted key/value storage.
 *
 * The Expo SecureStore implementation lives in `infrastructure/storage`, so
 * the domain and the auth repository never import native modules directly.
 */
export interface ISecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
