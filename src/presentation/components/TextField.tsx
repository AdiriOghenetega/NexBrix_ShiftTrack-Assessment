import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from './AppText';
import type { IoniconName } from './icon-name';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '../theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  readonly label?: string;
  /** Rendered on the right of the label row, e.g. a "Show password" toggle. */
  readonly labelAccessory?: ReactNode;
  /** Subtle icon prefix inside the field, e.g. `mail-outline` for email. */
  readonly prefixIcon?: IoniconName;
  readonly error?: string | null;
  readonly hint?: string;
}

/** White pill-cornered input with a hairline border and inline validation. */
export function TextField({
  label,
  labelAccessory,
  prefixIcon,
  error,
  hint,
  editable = true,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const borderColor = hasError
    ? colors.dangerBorder
    : focused
      ? colors.textPrimary
      : colors.border;

  return (
    <View style={styles.wrapper}>
      {label || labelAccessory ? (
        <View style={styles.labelRow}>
          {label ? <AppText variant="label">{label}</AppText> : <View />}
          {labelAccessory}
        </View>
      ) : null}

      <View
        style={[
          styles.shell,
          { borderColor, borderWidth: focused || hasError ? borderWidth.thick : borderWidth.hairline },
          editable ? null : styles.shellDisabled,
        ]}
      >
        {prefixIcon ? (
          <Ionicons name={prefixIcon} size={18} color={colors.textMuted} style={styles.prefix} />
        ) : null}

        <TextInput
          {...inputProps}
          editable={editable}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, prefixIcon ? styles.inputWithPrefix : null]}
        />
      </View>

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
  },
  shellDisabled: {
    backgroundColor: colors.cardMuted,
  },
  prefix: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
  },
  inputWithPrefix: {
    paddingLeft: 0,
  },
  message: {
    marginTop: spacing.xxs,
  },
});
