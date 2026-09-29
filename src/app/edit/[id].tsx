import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { formatClockTime, toDateKey } from '@/core/utils/time';
import type { CreateShiftFormValues } from '@/core/validation/shiftValidation';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
  ShiftForm,
  toShiftFormErrors,
} from '@/presentation/components';
import { haptics } from '@/presentation/haptics';
import { selectEditingRunningShift, useShiftEditorStore } from '@/presentation/store';

/**
 * Edit or delete a single shift.
 *
 * Pushed as a sibling of the tab group (see the root layout) so it covers the
 * tabs while the user is focused on one record. Running shifts are edited from
 * the Active tab instead, which owns clock-off.
 */
export default function EditShiftScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const shiftId = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';

  const shift = useShiftEditorStore((state) => state.shift);
  const status = useShiftEditorStore((state) => state.status);
  const loadError = useShiftEditorStore((state) => state.loadError);
  const isSaving = useShiftEditorStore((state) => state.isSaving);
  const isDeleting = useShiftEditorStore((state) => state.isDeleting);
  const formError = useShiftEditorStore((state) => state.formError);
  const loadShift = useShiftEditorStore((state) => state.loadShift);
  const saveShift = useShiftEditorStore((state) => state.saveShift);
  const removeShift = useShiftEditorStore((state) => state.removeShift);
  const clearFormError = useShiftEditorStore((state) => state.clearFormError);
  const reset = useShiftEditorStore((state) => state.reset);
  const isRunningShift = useShiftEditorStore(selectEditingRunningShift);

  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (shiftId.length > 0) {
      void loadShift(shiftId);
    }
    return () => reset();
  }, [shiftId, loadShift, reset]);

  const goBack = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const handleDelete = async (): Promise<void> => {
    const deleted = await removeShift();
    if (deleted) {
      haptics.success();
      goBack();
      return;
    }
    haptics.error();
  };

  const confirmDelete = (): void => {
    Alert.alert('Delete this shift?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDelete() },
    ]);
  };

  const initialValues: CreateShiftFormValues | null = shift
    ? {
        date: toDateKey(new Date(shift.startTime)),
        startTime: formatClockTime(shift.startTime),
        endTime: shift.endTime === null ? '' : formatClockTime(shift.endTime),
        breakMinutes: String(shift.breakMinutes),
        note: shift.note ?? '',
      }
    : null;

  return (
    <Screen keyboardAware>
      <ScreenHeader
        title="Edit shift"
        subtitle="Change the details, or delete the shift."
        onBack={goBack}
        accessory={<Badge label="Editing" tone="primary" icon="create-outline" />}
      />

      {status === 'loading' ? <LoadingState label="Loading the shift…" /> : null}

      {status === 'error' ? (
        <ErrorState
          title="Could not load that shift"
          message={loadError?.message ?? 'Please try again.'}
          onRetry={() => void loadShift(shiftId)}
          secondaryLabel="Back to this week"
          onSecondary={goBack}
        />
      ) : null}

      {status === 'ready' && isRunningShift ? (
        <Card tone="success">
          <AppText variant="subheading">This shift is still running</AppText>
          <AppText variant="label">
            Clock off from the Active tab, then come back to adjust its details.
          </AppText>
          <Button label="Go to the active shift" arrow onPress={() => router.replace('/active')} />
          <Button
            label="Back to this week"
            variant="ghost"
            icon="calendar-outline"
            onPress={goBack}
          />
        </Card>
      ) : null}

      {status === 'ready' && shift && !isRunningShift && initialValues ? (
        <ShiftForm
          // Remount per shift so the fields always start from the loaded record.
          key={shift.id}
          testID="edit-shift-submit"
          initialValues={initialValues}
          submitLabel={isSaving ? 'Saving…' : 'Save changes'}
          isSubmitting={isSaving}
          successMessage={notice}
          onDismissSuccess={() => setNotice(null)}
          errorMessage={formError?.message ?? null}
          onDismissError={clearFormError}
          onSubmitted={() => setNotice('Changes saved.')}
          onSubmit={async (values) => {
            const result = await saveShift({
              startTime: values.startTime,
              endTime: values.endTime,
              breakMinutes: values.breakMinutes,
              note: values.note,
            });
            return result.ok ? { ok: true } : { ok: false, fieldErrors: toShiftFormErrors(result.error) };
          }}
          footer={
            <Button
              label={isDeleting ? 'Deleting…' : 'Delete shift'}
              icon="trash-outline"
              variant="danger"
              loading={isDeleting}
              disabled={isDeleting || isSaving}
              onPress={confirmDelete}
              testID="delete-shift"
            />
          }
        />
      ) : null}
    </Screen>
  );
}
