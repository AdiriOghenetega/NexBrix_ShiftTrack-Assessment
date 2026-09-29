import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { haptics } from '../haptics';
import { borderWidth, colors, radius, shadow, spacing } from '../theme';

export interface ScreenHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly accessory?: ReactNode;
  /** Renders a leading back control; omit on tab roots. */
  readonly onBack?: () => void;
}

/** Screen title block with an optional back control and right-hand accessory. */
export function ScreenHeader({ title, subtitle, accessory, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable
          onPress={() => {
            haptics.impact('light');
            onBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>
      ) : null}

      <View style={styles.copy}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText variant="label">{subtitle}</AppText> : null}
      </View>

      {accessory ? <View>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flexShrink: 1,
    flexGrow: 1,
    gap: spacing.xxs,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    ...shadow.card,
  },
  backButtonPressed: {
    backgroundColor: colors.badgeFill,
  },
});
