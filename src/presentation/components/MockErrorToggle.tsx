import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { isMockDevToolsEnabled } from './mockDevTools';
import type { MockServerConfig } from '@/infrastructure/api/mockServer';
import { container } from '@/infrastructure/appContainer';
import { haptics } from '../haptics';
import { colors, radius, spacing } from '../theme';

export interface MockErrorToggleProps {
  /** When provided, a collapse control is rendered in the header. */
  readonly onCollapse?: () => void;
}

/**
 * Developer panel that drives the mock layer's failure flags.
 *
 * This is how the Loading / Error / Retry states are demoed: flip "Simulate
 * network errors" on, pull to refresh, and every request fails until the flag
 * is switched back off.
 *
 * Rendered through `MockDevWidget`, which owns the dev-only gate; this
 * component repeats the check so it can never be dropped into a release screen
 * by mistake.
 */
export function MockErrorToggle({ onCollapse }: MockErrorToggleProps) {
  const { mockServer } = container;
  const [config, setConfig] = useState<MockServerConfig>(() => mockServer.getConfig());

  if (!isMockDevToolsEnabled()) {
    return null;
  }

  const toggleErrors = (value: boolean): void => {
    haptics.selection();
    setConfig(mockServer.setAlwaysFail(value));
  };

  const failOnce = (): void => {
    setConfig(mockServer.failNext());
  };

  const resetMockData = (): void => {
    mockServer.resetDatabase();
    setConfig(mockServer.getConfig());
  };

  return (
    <Card tone="primary">
      <View style={styles.headerRow}>
        <Ionicons
          name="bug-outline"
          size={18}
          color={config.alwaysFail ? colors.danger : colors.textPrimary}
        />
        <AppText variant="label" style={styles.headerLabel}>
          Mock API controls
        </AppText>
        {onCollapse ? (
          <Pressable
            onPress={onCollapse}
            accessibilityRole="button"
            accessibilityLabel="Collapse mock API controls"
            hitSlop={10}
            style={({ pressed }) => [styles.collapseButton, pressed ? styles.collapseButtonPressed : null]}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <AppText variant="body">Simulate network errors</AppText>
          <AppText variant="caption">
            {config.alwaysFail ? 'Every request fails — error states are showing.' : 'Requests succeed normally.'}
          </AppText>
        </View>
        <Switch
          value={config.alwaysFail}
          onValueChange={toggleErrors}
          trackColor={{ false: colors.borderStrong, true: colors.dangerBorder }}
          thumbColor={config.alwaysFail ? colors.danger : colors.card}
          ios_backgroundColor={colors.borderStrong}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Fail next request"
          variant="secondary"
          size="sm"
          icon="flash-outline"
          onPress={failOnce}
          fullWidth={false}
          style={styles.actionButton}
        />
        <Button
          label="Reset mock data"
          variant="secondary"
          size="sm"
          icon="refresh"
          onPress={resetMockData}
          fullWidth={false}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLabel: {
    flex: 1,
    color: colors.textSecondary,
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButtonPressed: {
    backgroundColor: colors.badgeFill,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
  },
});
