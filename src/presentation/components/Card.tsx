import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, layout, radius, shadow, spacing } from '../theme';

export type CardTone = 'default' | 'primary' | 'danger' | 'success';

export interface CardProps {
  readonly children: React.ReactNode;
  readonly tone?: CardTone;
  readonly padded?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  /** Slightly stronger elevation for hero cards. */
  readonly elevated?: boolean;
}

const TONE_BORDER: Record<CardTone, string> = {
  default: colors.border,
  primary: colors.border,
  danger: colors.dangerBorder,
  success: colors.successBorder,
};

const TONE_BACKGROUND: Record<CardTone, string> = {
  default: colors.card,
  primary: colors.cardMuted,
  danger: colors.dangerSoft,
  success: colors.successSoft,
};

/**
 * Pure-white surface with a hairline zinc border, 20px corners and soft
 * elevation — the core NexBrix container.
 *
 * `overflow` is intentionally left visible so the shadow is not clipped on iOS.
 */
export function Card({ children, tone = 'default', padded = true, elevated = false, style }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: TONE_BACKGROUND[tone],
          borderColor: TONE_BORDER[tone],
        },
        padded ? styles.padded : null,
        elevated ? shadow.raised : shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
  },
  padded: {
    padding: layout.cardPadding,
    gap: spacing.md,
  },
});
