import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from './AppText';
import type { IoniconName } from './icon-name';
import { haptics } from '../haptics';
import { borderWidth, colors, opacity, radius, shadow, spacing } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Shows a spinner and blocks interaction (prevents double submits). */
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  /** Leading icon. */
  readonly icon?: IoniconName;
  /** Trailing `→` arrow, as used on the NexBrix primary CTAs. */
  readonly arrow?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly accessibilityHint?: string;
  readonly testID?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 50, lg: 56 };

interface VariantStyle {
  readonly background: string;
  readonly border: string;
  readonly text: string;
  readonly pressedBackground: string;
  /** Explicit disabled fill; falls back to reduced opacity when omitted. */
  readonly disabledBackground?: string;
  readonly disabledText?: string;
}

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  /** Dark pill CTA (`#18181B`) with white bold text. */
  primary: {
    background: colors.primary,
    border: colors.primary,
    text: colors.textOnPrimary,
    pressedBackground: colors.primaryPressed,
    disabledBackground: colors.primaryDisabled,
    disabledText: colors.textOnPrimary,
  },
  /** Outlined white pill with a hairline zinc border. */
  secondary: {
    background: colors.secondaryBackground,
    border: colors.secondaryBorder,
    text: colors.secondaryText,
    pressedBackground: colors.badgeFill,
  },
  ghost: {
    background: 'transparent',
    border: 'transparent',
    text: colors.textSecondary,
    pressedBackground: colors.badgeFill,
  },
  danger: {
    background: colors.dangerSoft,
    border: colors.dangerBorder,
    text: colors.danger,
    pressedBackground: colors.dangerPressed,
  },
  /** Mint pill reserved for "clock on" style positive actions. */
  success: {
    background: colors.success,
    border: colors.success,
    text: colors.textOnSuccess,
    pressedBackground: colors.successPressed,
    disabledBackground: colors.primaryDisabled,
    disabledText: colors.textOnPrimary,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  arrow = false,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const tokens = VARIANTS[variant];
  const isInactive = disabled || loading;
  const hasDisabledFill = tokens.disabledBackground !== undefined;

  const handlePress = (): void => {
    if (!onPress) {
      return;
    }
    // Weight the feedback by how consequential the action is. Disabled buttons
    // never reach here because Pressable swallows their presses.
    haptics.impact(variant === 'secondary' || variant === 'ghost' ? 'light' : 'medium');
    onPress();
  };

  const background = isInactive && hasDisabledFill
    ? tokens.disabledBackground
    : tokens.background;
  const borderColor = isInactive && hasDisabledFill ? tokens.disabledBackground : tokens.border;
  const contentColor = isInactive && tokens.disabledText ? tokens.disabledText : tokens.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isInactive}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: pressed && !isInactive ? tokens.pressedBackground : background,
          borderColor,
        },
        (variant === 'primary' || variant === 'success') && !isInactive ? shadow.button : null,
        fullWidth ? styles.fullWidth : null,
        isInactive && !hasDisabledFill ? { opacity: opacity.disabled } : null,
        style,
      ]}
    >
      {({ pressed }) => {
        // A pressed primary pill keeps its white label; other variants keep theirs.
        const labelColor = pressed && !isInactive && variant === 'primary' ? colors.textOnPrimary : contentColor;

        if (loading) {
          return <ActivityIndicator size="small" color={labelColor} />;
        }

        return (
          <View style={styles.content}>
            {icon ? (
              <Ionicons name={icon} size={size === 'sm' ? 15 : 17} color={labelColor} />
            ) : null}
            <AppText
              variant="button"
              color={labelColor}
              style={{ fontSize: size === 'sm' ? 13 : 15 }}
              numberOfLines={1}
            >
              {label}
            </AppText>
            {arrow ? (
              <Ionicons
                name="arrow-forward"
                size={size === 'sm' ? 15 : 17}
                color={labelColor}
                style={styles.trailingIcon}
              />
            ) : null}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trailingIcon: {
    marginLeft: spacing.xxs,
  },
});
