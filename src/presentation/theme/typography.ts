import { Platform, StyleSheet, type TextStyle } from 'react-native';

import { colors } from './colors';

export const fontFamily = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  semibold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  display: 34,
  timer: 52,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const letterSpacing = {
  /** Tight tracking for headings, as used on nexbrix.com.au. */
  tight: -0.6,
  snug: -0.3,
  normal: 0,
  wide: 0.6,
  wider: 1.4,
} as const;

export const textStyles = StyleSheet.create({
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: 40,
    color: colors.textPrimary,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.snug,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  subheading: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.snug,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  /** Muted supporting copy (`#71717A`). */
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  /** Subtle helper text and hints (`#A1A1AA`). */
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  timer: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.timer,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  button: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.normal,
  },
});

export type TextVariant = keyof typeof textStyles;
