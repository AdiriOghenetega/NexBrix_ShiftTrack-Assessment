import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { colors, spacing } from '../theme';

export interface LoadingStateProps {
  readonly label?: string;
  readonly compact?: boolean;
}

/** Centred spinner used while a screen or card is fetching. */
export function LoadingState({ label = 'Loading…', compact = false }: LoadingStateProps) {
  return (
    <View style={[styles.container, compact ? styles.compact : null]}>
      <ActivityIndicator color={colors.primary} size={compact ? 'small' : 'large'} />
      <AppText variant="label" align="center">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
  compact: {
    paddingVertical: spacing.xl,
  },
});
