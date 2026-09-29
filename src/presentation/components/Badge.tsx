import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import type { IoniconName } from './icon-name';
import { borderWidth, colors, radius, spacing } from '../theme';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps {
  readonly label: string;
  readonly tone?: BadgeTone;
  readonly icon?: IoniconName;
  /** Renders a small status dot before the label (mint for live/active states). */
  readonly dot?: boolean;
}

const TONE_STYLES: Record<BadgeTone, { background: string; border: string; text: string }> = {
  // Soft zinc fill for the default/primary pill.
  primary: { background: colors.badgeFill, border: colors.border, text: colors.primary },
  neutral: { background: colors.badgeFill, border: colors.border, text: colors.textSecondary },
  success: { background: colors.successSoft, border: colors.successBorder, text: colors.successText },
  warning: { background: colors.warningSoft, border: colors.warningBorder, text: colors.warningText },
  danger: { background: colors.dangerSoft, border: colors.dangerBorder, text: colors.danger },
};

/** Crisp pill badge used for statuses and metrics. */
export function Badge({ label, tone = 'neutral', icon, dot = false }: BadgeProps) {
  const toneStyle = TONE_STYLES[tone];
  const dotColor = tone === 'success' ? colors.live : colors.textMuted;

  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.background, borderColor: toneStyle.border }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {icon ? <Ionicons name={icon} size={12} color={toneStyle.text} /> : null}
      <AppText variant="overline" color={toneStyle.text} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  label: {
    letterSpacing: 0.8,
  },
});
