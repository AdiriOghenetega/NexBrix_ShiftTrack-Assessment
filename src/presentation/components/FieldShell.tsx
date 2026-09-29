import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import type { IoniconName } from './icon-name';
import { borderWidth, colors, radius, spacing } from '../theme';

export interface FieldShellProps {
  readonly label?: string;
  /** Rendered on the right of the label row, e.g. a "Show password" toggle. */
  readonly labelAccessory?: ReactNode;
  /** Where the field navigates or opens. */
  readonly onPress: () => void;
  readonly disabled?: boolean;
  /** Draws the "active" border while the field's picker is showing. */
  readonly open?: boolean;
  readonly error?: string | null;
  readonly hint?: string;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
  /** Rendered between the shell and the message, e.g. an inline calendar. */
  readonly expandedContent?: ReactNode;
  /** The inner row: icon, value text, chevron… */
  readonly children: ReactNode;
}

/**
 * Shared pressable field chrome — label, hairline border, error/hint messaging.
 *
 * Used by the picker-backed fields (`DateField`, `SelectField`) so they stay
 * visually identical to each other and to `TextField` without duplicating the
 * border/validation styling in every component.
 */
export function FieldShell({
  label,
  labelAccessory,
  onPress,
  disabled = false,
  open = false,
  error,
  hint,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  expandedContent,
  children,
}: FieldShellProps) {
  const hasError = Boolean(error);
  const emphasised = hasError || open;

  return (
    <View style={styles.wrapper}>
      {label || labelAccessory ? (
        <View style={styles.labelRow}>
          {label ? <AppText variant="label">{label}</AppText> : <View />}
          {labelAccessory}
        </View>
      ) : null}

      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, expanded: open }}
        style={({ pressed }) => [
          styles.shell,
          {
            borderColor: hasError ? colors.dangerBorder : open ? colors.textPrimary : colors.border,
            borderWidth: emphasised ? borderWidth.thick : borderWidth.hairline,
          },
          pressed && !disabled ? styles.shellPressed : null,
          disabled ? styles.shellDisabled : null,
          style,
        ]}
      >
        {children}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {expandedContent}

      {hasError ? (
        <AppText variant="caption" color={colors.danger} style={styles.message}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" style={styles.message}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Leading icon for a field row. */
export function FieldPrefixIcon({ name }: { readonly name: IoniconName }) {
  return <Ionicons name={name} size={18} color={colors.textMuted} style={styles.prefix} />;
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.input,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  shellPressed: {
    backgroundColor: colors.cardMuted,
  },
  shellDisabled: {
    backgroundColor: colors.cardMuted,
    opacity: 0.6,
  },
  prefix: {
    marginRight: spacing.xxs,
  },
  message: {
    marginTop: spacing.xxs,
  },
});
