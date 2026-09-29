import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { colors, radius, spacing } from '../theme';

export interface ErrorStateProps {
  readonly title?: string;
  readonly message: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
}

/** Error panel with a retry trigger — used for every failed fetch. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  secondaryLabel,
  onSecondary,
}: ErrorStateProps) {
  return (
    <Card tone="danger" style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
      </View>
      <View style={styles.copy}>
        <AppText variant="subheading">{title}</AppText>
        <AppText variant="label" style={styles.message}>
          {message}
        </AppText>
      </View>
      <View style={styles.actions}>
        {onRetry ? (
          <Button label={retryLabel} icon="refresh" arrow onPress={onRetry} variant="primary" />
        ) : null}
        {secondaryLabel && onSecondary ? (
          <Button label={secondaryLabel} onPress={onSecondary} variant="secondary" />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  copy: {
    gap: spacing.xs,
  },
  message: {
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
});
