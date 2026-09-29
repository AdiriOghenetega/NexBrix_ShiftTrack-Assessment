import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Badge,
  Button,
  Screen,
  ScreenHeader,
  ShiftForm,
  toShiftFormErrors,
} from '@/presentation/components';
import { useShiftStore } from '@/presentation/store';

export default function CreateShiftScreen() {
  const router = useRouter();

  const isCreating = useShiftStore((state) => state.isCreating);
  const createError = useShiftStore((state) => state.createError);
  const clearCreateError = useShiftStore((state) => state.clearCreateError);
  const createShift = useShiftStore((state) => state.createShift);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <Screen keyboardAware>
      <ScreenHeader
        title="Add a shift"
        subtitle="Log a completed shift. End time must be after the start time."
        accessory={<Badge label="Manual entry" tone="primary" icon="create-outline" />}
      />

      <ShiftForm
        testID="create-shift-submit"
        submitLabel={isCreating ? 'Saving…' : 'Save shift'}
        isSubmitting={isCreating}
        successMessage={successMessage}
        onDismissSuccess={() => setSuccessMessage(null)}
        errorMessage={createError?.message ?? null}
        onDismissError={clearCreateError}
        resetOnSuccess
        onSubmitted={() => setSuccessMessage('Shift saved. Your week has been refreshed.')}
        onSubmit={async (values) => {
          const result = await createShift({
            startTime: values.startTime,
            endTime: values.endTime,
            breakMinutes: values.breakMinutes,
            note: values.note,
          });
          return result.ok ? { ok: true } : { ok: false, fieldErrors: toShiftFormErrors(result.error) };
        }}
        footer={
          <Button
            label="Back to this week"
            variant="ghost"
            icon="calendar-outline"
            disabled={isCreating}
            onPress={() => router.navigate('/')}
          />
        }
      />
    </Screen>
  );
}
