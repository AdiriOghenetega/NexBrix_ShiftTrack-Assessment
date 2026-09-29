import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import type { IoniconName } from './icon-name';
import { borderWidth, colors, radius, shadow, spacing } from '../theme';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: IoniconName;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

/** Crisp empty state with a floating icon chip and an optional call to action. */
export function EmptyState({ title, description, icon = 'calendar-outline', actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconChip}>
        <Ionicons name={icon} size={26} color={colors.textPrimary} />
      </View>
      <View style={styles.copy}>
        <AppText variant="subheading" align="center">
          {title}
        </AppText>
        {description ? (
          <AppText variant="label" align="center" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} icon="add" onPress={onAction} fullWidth={false} arrow style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.lg,
  },
  iconChip: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    ...shadow.card,
  },
  copy: {
    gap: spacing.xs,
  },
  description: {
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  action: {
    paddingHorizontal: spacing.xxl,
  },
});
