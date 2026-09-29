/**
 * Whether the developer tooling (mock failure injection) may be shown.
 *
 * Lives outside the component files so the mock panel, the floating widget and
 * the feature tour all read the same gate instead of duplicating the rule.
 */
import { container } from '@/infrastructure/appContainer';

export function isMockDevToolsEnabled(): boolean {
  const { mockApiEnabled, isDevelopmentRuntime } = container.config;
  return mockApiEnabled && (isDevelopmentRuntime ?? true);
}
