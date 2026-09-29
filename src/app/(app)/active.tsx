import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  formatClockTime,
  formatFullDateLabel,
  formatMinutesAsDuration,
  workedDurationMinutes,
} from '@/core/utils/time';
import { getBreakMinutesError } from '@/core/validation/shiftValidation';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorBanner,
  ErrorState,
  LiveTimer,
  LoadingState,
  Screen,
  ScreenHeader,
  StatTile,
  TextField,
} from '@/presentation/components';
import { useNow } from '@/presentation/hooks/useNow';
import { haptics } from '@/presentation/haptics';
import { useShiftStore } from '@/presentation/store';
import { borderWidth, colors, radius, spacing } from '@/presentation/theme';

export default function ActiveShiftScreen() {
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [breakError, setBreakError] = useState<string | null>(null);

  const activeShift = useShiftStore((state) => state.activeShift);
  const activeStatus = useShiftStore((state) => state.activeStatus);
  const activeError = useShiftStore((state) => state.activeError);
  const actionError = useShiftStore((state) => state.actionError);
  const isStarting = useShiftStore((state) => state.isStarting);
  const isEnding = useShiftStore((state) => state.isEnding);
  const loadActiveShift = useShiftStore((state) => state.loadActiveShift);
  const startShift = useShiftStore((state) => state.startShift);
  const endShift = useShiftStore((state) => state.endShift);
  const clearActionError = useShiftStore((state) => state.clearActionError);

  useEffect(() => {
    if (activeStatus === 'idle') {
      void loadActiveShift();
    }
  }, [activeStatus, loadActiveShift]);

  const nowMs = useNow(1_000, activeShift !== null);

  const handleStart = async (): Promise<void> => {
    if (isStarting) {
      return;
    }

    const parsed = Number(breakMinutes.trim().length > 0 ? breakMinutes.trim() : '0');
    const error = getBreakMinutesError(parsed);
    if (error) {
      setBreakError(error);
      return;
    }

    setBreakError(null);

    const started = await startShift(parsed);
    if (started) {
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const confirmEndShift = async (): Promise<void> => {
    const ended = await endShift();
    if (ended) {
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const handleEnd = (): void => {
    Alert.alert('End this shift?', 'The live timer stops and the hours are saved to your week.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End shift', style: 'destructive', onPress: () => void confirmEndShift() },
    ]);
  };

  const workedMinutes = activeShift
    ? workedDurationMinutes(activeShift.startTime, activeShift.endTime, activeShift.breakMinutes, nowMs)
    : 0;

  const isChecking = activeStatus === 'loading' && !activeShift;
  const isCheckFailed = activeStatus === 'error' && !activeShift;

  return (
    <Screen keyboardAware>
      <ScreenHeader
        title="Active shift"
        subtitle="Clock on, watch the hours build, clock off."
        accessory={
          activeShift ? (
            <Badge label="Running" tone="success" dot />
          ) : (
            <Badge label="Idle" tone="neutral" dot />
          )
        }
      />

      {actionError ? (
        <ErrorBanner message={actionError.message} tone="error" onDismiss={clearActionError} />
      ) : null}

      {isChecking ? <LoadingState label="Checking for a running shift…" /> : null}

      {isCheckFailed && activeError ? (
        <ErrorState
          title="Could not check your shift"
          message={activeError.message}
          onRetry={() => void loadActiveShift()}
        />
      ) : null}

      {!isChecking && !isCheckFailed && !activeShift ? (
        <Card elevated>
          <View style={styles.cardHeader}>
            <View style={styles.iconChip}>
              <Ionicons name="play-circle-outline" size={22} color={colors.textPrimary} />
            </View>
            <View style={styles.cardHeaderCopy}>
              <AppText variant="heading">Start a shift</AppText>
              <AppText variant="label">
                The start time is captured as an absolute timestamp, so the timer stays accurate even if the app is
                backgrounded or closed.
              </AppText>
            </View>
          </View>

          <TextField
            label="Unpaid break (minutes)"
            prefixIcon="cafe-outline"
            value={breakMinutes}
            onChangeText={(value) => {
              setBreakMinutes(value);
              if (breakError) {
                setBreakError(null);
              }
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder="0"
            editable={!isStarting}
            error={breakError}
            hint="You can adjust the break when you end the shift."
          />

          <Button
            label={isStarting ? 'Starting…' : 'Start shift now'}
            icon="play"
            arrow
            variant="success"
            loading={isStarting}
            disabled={isStarting}
            onPress={() => void handleStart()}
            testID="start-shift"
          />
        </Card>
      ) : null}

      {activeShift ? (
        <>
          <Card tone="success" elevated>
            <LiveTimer startIsoTimestamp={activeShift.startTime} running />
          </Card>

          <Card>
            <View style={styles.summaryRow}>
              <StatTile label="Worked" value={formatMinutesAsDuration(workedMinutes)} caption="excluding break" />
              <StatTile label="Break" value={`${activeShift.breakMinutes}m`} caption="unpaid" />
            </View>
            <View style={styles.divider} />
            <View style={styles.metaRow}>
              <Ionicons name="play-outline" size={16} color={colors.textSecondary} />
              <AppText variant="label">
                Started {formatClockTime(activeShift.startTime)} · {formatFullDateLabel(activeShift.startTime)}
              </AppText>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="finger-print-outline" size={16} color={colors.textSecondary} />
              <AppText variant="caption">Shift id {activeShift.id}</AppText>
            </View>
          </Card>

          <Button
            label={isEnding ? 'Ending…' : 'End shift'}
            icon="stop-circle-outline"
            variant="danger"
            loading={isEnding}
            disabled={isEnding}
            onPress={handleEnd}
            testID="end-shift"
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.badgeFill,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
