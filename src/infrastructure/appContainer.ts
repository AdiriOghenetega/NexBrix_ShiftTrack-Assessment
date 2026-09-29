/**
 * The app-wide container instance.
 *
 * Imports the native SecureStore adapter, so this file is only ever imported by
 * the running application (and never by the Node unit-test suite).
 */

import { createAppContainer, type AppContainer } from './container';
import { SecureStoreStorage } from './storage/SecureStoreStorage';

export const container: AppContainer = createAppContainer({
  storage: new SecureStoreStorage(),
});

export type { AppContainer };
