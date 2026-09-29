import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import type { IoniconName } from './icon-name';
import { borderWidth, colors, radius, spacing } from '../theme';

export type BannerTone = 'error' | 'warning' | 'info' | 'success';

export interface ErrorBannerProps {
  readonly message: string;
  readonly tone?: BannerTone;
  readonly onDismiss?: () => void;
}

const TONE: Record<BannerTone, { background: string; border: string; text: string; icon: IoniconName }> = {
  error: {
    background: colors.dangerSoft,
    border: colors.dangerBorder,
    text: colors.danger,
    icon: 'alert-circle-outline',
  },
  warning: {
    background: colors.warningSoft,
    border: colors.warningBorder,
    text: colors.warningText,
    icon: 'warning-outline',
  },
  // Neutral zinc notice, matching the light-mode badge palette.
  info: {
    background: colors.badgeFill,
    border: colors.border,
    text: colors.primary,
    icon: 'information-circle-outline',
  },
  success: {
    background: colors.successSoft,
    border: colors.successBorder,
    text: colors.successText,
    icon: 'checkmark-circle-outline',
  },
};

/** Inline, dismissible message for form-level errors and notices. */
export function ErrorBanner({ message, tone = 'error', onDismiss }: ErrorBannerProps) {
  const tokens = TONE[tone];

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
      <Ionicons name={tokens.icon} size={18} color={tokens.text} />
      <AppText variant="label" color={tokens.text} style={styles.message}>
        {message}
      </AppText>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          hitSlop={8}
        >
          <Ionicons name="close" size={16} color={tokens.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: borderWidth.hairline,
  },
  message: {
    flex: 1,
    lineHeight: 19,
  },
});
