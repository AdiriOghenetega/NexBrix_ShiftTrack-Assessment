import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { FieldPrefixIcon, FieldShell } from './FieldShell';
import { formatFullDateLabel, fromDateKey, isValidDateKey, toDateKey } from '@/core/utils/time';
import { haptics } from '../haptics';
import { colors, layout, spacing } from '../theme';

export interface DateFieldProps {
  readonly label: string;
  /** Local `YYYY-MM-DD` key. */
  readonly value: string;
  readonly onChange: (dateKey: string) => void;
  readonly error?: string | null;
  readonly hint?: string;
  readonly disabled?: boolean;
  readonly testID?: string;
}

/**
 * Date field backed by the platform's own picker.
 *
 * On iOS the calendar renders inline beneath the field (`display="inline"`,
 * light theme, charcoal accent) and stays open while the user browses months;
 * on Android the native date dialog is presented instead. Either way the value
 * handed to the form stays a plain `YYYY-MM-DD` key, so validation and the shift
 * use cases are untouched.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
  disabled = false,
  testID,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  /** Width the calendar may occupy, and the picker's own intrinsic width. */
  const [availableWidth, setAvailableWidth] = useState(0);
  const [pickerWidth, setPickerWidth] = useState(0);

  const hasValue = isValidDateKey(value);
  const selectedDate = hasValue ? fromDateKey(value) : new Date();

  // The native inline calendar has a fixed intrinsic width that is wider than a
  // card's inner column on most phones. Rather than guess it, measure both and
  // shrink only when it genuinely does not fit — otherwise `scale` stays 1 and
  // nothing is clipped (which is what cut the Sunday column off before).
  const scale =
    availableWidth > 0 && pickerWidth > 0 ? Math.min(1, availableWidth / pickerWidth) : 1;

  const close = (): void => {
    setIsOpen(false);
  };

  const handleChange = (event: DateTimePickerEvent, date?: Date): void => {
    if (Platform.OS !== 'ios') {
      // The Android picker is a dialog: it reports both confirm and dismiss.
      close();
    }

    if (event.type === 'set' && date) {
      haptics.selection();
      onChange(toDateKey(date));
    }
  };

  return (
    <FieldShell
      label={label}
      onPress={() => {
        haptics.selection();
        setIsOpen((open) => !open);
      }}
      disabled={disabled}
      open={isOpen}
      error={error}
      hint={hint}
      accessibilityLabel={`${label}: ${hasValue ? formatFullDateLabel(value) : 'no date selected'}`}
      accessibilityHint="Opens the calendar to choose a date"
      testID={testID}
      expandedContent={
        isOpen ? (
          <>
            <View
              style={styles.calendarRow}
              onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}
            >
              <View
                style={[styles.calendarSizer, { transform: [{ scale }] }]}
                onLayout={(event) => setPickerWidth(event.nativeEvent.layout.width)}
              >
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="inline"
                    themeVariant="light"
                    accentColor={colors.primary}
                    onChange={handleChange}
                  />
                ) : (
                  <DateTimePicker value={selectedDate} mode="date" onChange={handleChange} />
                )}
              </View>
            </View>

            {Platform.OS === 'ios' ? (
              <Pressable
                onPress={() => {
                  haptics.selection();
                  close();
                }}
                accessibilityRole="button"
                accessibilityLabel="Close the calendar"
                hitSlop={8}
                style={styles.done}
              >
                <AppText variant="label" color={colors.primary}>
                  Done
                </AppText>
              </Pressable>
            ) : null}
          </>
        ) : null
      }
    >
      <FieldPrefixIcon name="calendar-outline" />
      <AppText variant="body" style={styles.value} numberOfLines={1}>
        {hasValue ? formatFullDateLabel(value) : 'Select a date'}
      </AppText>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  value: {
    flex: 1,
  },
  calendarRow: {
    // Cancel the card's inner padding so the calendar can use the full card
    // width, then centre it so every column (Sunday included) stays on screen.
    marginHorizontal: -layout.cardPadding,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  calendarSizer: {
    // Keep the intrinsic width so it can be measured; `scale` does the fitting.
    flexShrink: 0,
    alignItems: 'center',
  },
  done: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
