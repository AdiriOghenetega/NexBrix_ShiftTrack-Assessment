import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { DateField } from './DateField';
import { ErrorBanner } from './ErrorBanner';
import { SelectField } from './SelectField';
import { TextField } from './TextField';
import type { AppError } from '@/core/errors';
import { buildTimeOfDayOptions, combineDateKeyAndTime, toDateKey } from '@/core/utils/time';
import {
  emptyCreateShiftForm,
  validateCreateShiftForm,
  type CreateShiftFormValues,
  type ShiftFormErrors,
  type ShiftFormField,
} from '@/core/validation/shiftValidation';
import { haptics } from '../haptics';
import { borderWidth, colors, radius, spacing } from '../theme';

/** Times are offered every 15 minutes — fine enough for real shifts, short enough to scan. */
const TIME_OPTIONS = buildTimeOfDayOptions(15);

/** Validated, wire-ready values handed to the caller on submit. */
export interface ShiftFormSubmitValues {
  readonly startTime: string;
  readonly endTime: string;
  readonly breakMinutes: number;
  readonly note: string | null;
}

export interface ShiftFormOutcome {
  readonly ok: boolean;
  /** Field errors returned by the API, mapped back onto the inputs. */
  readonly fieldErrors?: ShiftFormErrors;
}

export interface ShiftFormProps {
  /** Field defaults; omitted means "a blank shift dated today" (create). */
  readonly initialValues?: CreateShiftFormValues;
  readonly submitLabel: string;
  readonly isSubmitting: boolean;
  readonly onSubmit: (values: ShiftFormSubmitValues) => Promise<ShiftFormOutcome>;
  /** Runs after a successful submit, e.g. to close a screen. */
  readonly onSubmitted?: () => void;
  /** Clears the fields back to `initialValues` after a successful submit. */
  readonly resetOnSuccess?: boolean;
  readonly errorMessage?: string | null;
  readonly onDismissError?: () => void;
  readonly successMessage?: string | null;
  readonly onDismissSuccess?: () => void;
  readonly disabled?: boolean;
  readonly testID?: string;
  /** Extra actions rendered beneath the submit button, e.g. Delete. */
  readonly footer?: ReactNode;
}

/** Maps a failed use case onto the form's per-field messages. */
export function toShiftFormErrors(error: AppError): ShiftFormErrors {
  const fieldErrors = error.fieldErrors;
  if (!fieldErrors) {
    return {};
  }
  return {
    ...(fieldErrors.date ? { date: fieldErrors.date } : {}),
    ...(fieldErrors.startTime ? { startTime: fieldErrors.startTime } : {}),
    ...(fieldErrors.endTime ? { endTime: fieldErrors.endTime } : {}),
    ...(fieldErrors.breakMinutes ? { breakMinutes: fieldErrors.breakMinutes } : {}),
    ...(fieldErrors.note ? { note: fieldErrors.note } : {}),
  };
}

/**
 * The single shift form used by both "Add shift" and "Edit shift".
 *
 * It owns the field state, the shared validation rules, the date/time → ISO
 * conversion and the submit lifecycle; the caller only supplies the async work
 * and any screen-level chrome. Keeping one implementation is what stops the two
 * screens' rules from drifting apart.
 */
export function ShiftForm({
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  onSubmitted,
  resetOnSuccess = false,
  errorMessage,
  onDismissError,
  successMessage,
  onDismissSuccess,
  disabled = false,
  testID,
  footer,
}: ShiftFormProps) {
  const baseline = initialValues ?? emptyCreateShiftForm(toDateKey(new Date()));
  const [values, setValues] = useState<CreateShiftFormValues>(baseline);
  const [errors, setErrors] = useState<ShiftFormErrors>({});

  const isBusy = disabled || isSubmitting;

  const updateField = (field: ShiftFormField, value: string): void => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!(field in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    // Double-submit guard: the button is also disabled while pending.
    if (isSubmitting) {
      return;
    }

    onDismissError?.();
    onDismissSuccess?.();

    const validation = validateCreateShiftForm(values);
    setErrors(validation.errors);
    if (!validation.valid) {
      haptics.error();
      return;
    }

    let startTime: string;
    let endTime: string;
    try {
      startTime = combineDateKeyAndTime(values.date.trim(), values.startTime.trim());
      endTime = combineDateKeyAndTime(values.date.trim(), values.endTime.trim());
    } catch {
      // Defensive: validation above should already have caught this.
      setErrors({ startTime: 'Enter a valid date and time.' });
      haptics.error();
      return;
    }

    const outcome = await onSubmit({
      startTime,
      endTime,
      breakMinutes: Number(values.breakMinutes.trim()),
      note: values.note.trim().length > 0 ? values.note.trim() : null,
    });

    if (!outcome.ok) {
      if (outcome.fieldErrors) {
        setErrors(outcome.fieldErrors);
      }
      haptics.error();
      return;
    }

    haptics.success();
    if (resetOnSuccess) {
      setValues(baseline);
      setErrors({});
    }
    onSubmitted?.();
  };

  return (
    <>
      {successMessage ? (
        <ErrorBanner message={successMessage} tone="success" onDismiss={onDismissSuccess} />
      ) : null}

      {errorMessage ? (
        <ErrorBanner message={errorMessage} tone="error" onDismiss={onDismissError} />
      ) : null}

      <Card elevated>
        <DateField
          label="Date"
          value={values.date}
          onChange={(dateKey) => updateField('date', dateKey)}
          disabled={isBusy}
          error={errors.date}
          hint="Tap to pick a day from the calendar."
        />

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <SelectField
              label="Start time"
              sheetTitle="Shift start"
              value={values.startTime}
              options={TIME_OPTIONS}
              onChange={(time) => updateField('startTime', time)}
              placeholder="Select"
              prefixIcon="time-outline"
              disabled={isBusy}
              error={errors.startTime}
            />
          </View>
          <View style={styles.timeField}>
            <SelectField
              label="End time"
              sheetTitle="Shift end"
              value={values.endTime}
              options={TIME_OPTIONS}
              onChange={(time) => updateField('endTime', time)}
              placeholder="Select"
              prefixIcon="time-outline"
              disabled={isBusy}
              error={errors.endTime}
            />
          </View>
        </View>

        <TextField
          label="Unpaid break (minutes)"
          prefixIcon="cafe-outline"
          value={values.breakMinutes}
          onChangeText={(value) => updateField('breakMinutes', value)}
          placeholder="30"
          keyboardType="number-pad"
          editable={!isBusy}
          error={errors.breakMinutes}
        />

        <TextField
          label="Note (optional)"
          prefixIcon="document-text-outline"
          value={values.note}
          onChangeText={(value) => updateField('note', value)}
          placeholder="Front desk, stocktake…"
          maxLength={280}
          editable={!isBusy}
          error={errors.note}
        />

        <View style={styles.previewRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <AppText variant="caption">
            Total hours are calculated as (end − start) minus the unpaid break.
          </AppText>
        </View>

        <Button
          label={submitLabel}
          arrow
          loading={isSubmitting}
          disabled={isBusy}
          onPress={() => void handleSubmit()}
          testID={testID}
        />

        {footer}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.cardMuted,
    borderWidth: borderWidth.hairline,
    borderColor: colors.borderSubtle,
  },
});
