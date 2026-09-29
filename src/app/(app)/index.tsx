import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { displayName, initials } from '@/core/entities/User';
import { formatDecimalHours, formatMinutesAsDuration, workedDurationMinutes } from '@/core/utils/time';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  ErrorState,
  LiveTimer,
  LoadingState,
  Screen,
  ScreenHeader,
  ShiftCard,
  StatTile,
  WeekSwitcher,
} from '@/presentation/components';
import { useNow } from '@/presentation/hooks/useNow';
import { haptics } from '@/presentation/haptics';
import {
  selectAuthUser,
  selectIsCurrentWeek,
  useAuthStore,
  useShiftStore,
  useTourStore,
} from '@/presentation/store';
import { colors, radius, shadow, spacing } from '@/presentation/theme';

export default function WeeklyShiftsScreen() {
  const router = useRouter();

  const user = useAuthStore(selectAuthUser);
  const signOut = useAuthStore((state) => state.signOut);
  const startTour = useTourStore((state) => state.startTour);

  const weekStartKey = useShiftStore((state) => state.weekStartKey);
  const shifts = useShiftStore((state) => state.shifts);
  const status = useShiftStore((state) => state.status);
  const error = useShiftStore((state) => state.error);
  const isRefreshing = useShiftStore((state) => state.isRefreshing);
  const isCurrentWeek = useShiftStore(selectIsCurrentWeek);
  const activeShift = useShiftStore((state) => state.activeShift);

  const loadWeek = useShiftStore((state) => state.loadWeek);
  const reloadWeek = useShiftStore((state) => state.reloadWeek);
  const loadActiveShift = useShiftStore((state) => state.loadActiveShift);
  const goToPreviousWeek = useShiftStore((state) => state.goToPreviousWeek);
  const goToNextWeek = useShiftStore((state) => state.goToNextWeek);
  const goToCurrentWeek = useShiftStore((state) => state.goToCurrentWeek);

  // Ticks once a second only while a shift is running, so the derived worked
  // minutes stay honest without re-rendering the list needlessly.
  const nowMs = useNow(1_000, activeShift !== null);

  useEffect(() => {
    void loadWeek();
    void loadActiveShift();
  }, [loadWeek, loadActiveShift]);

  const weekWorkedMinutes = shifts.reduce(
    (total, shift) => total + workedDurationMinutes(shift.startTime, shift.endTime, shift.breakMinutes, nowMs),
    0,
  );
  const totalBreakMinutes = shifts.reduce((total, shift) => total + shift.breakMinutes, 0);

  const hasShifts = shifts.length > 0;
  const isInitialLoading = status === 'loading' && !hasShifts;
  const isInitialError = status === 'error' && !hasShifts;

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => void reloadWeek()}>
      <ScreenHeader
        title={`Hi, ${user ? displayName(user) : 'there'}`}
        subtitle="Here is your week at a glance."
        accessory={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                haptics.selection();
                startTour();
              }}
              accessibilityRole="button"
              accessibilityLabel="Replay the feature tour"
              accessibilityHint="Walks through the main features again"
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.iconButtonPressed : null]}
            >
              <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.impact('light');
                void signOut();
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={styles.profileChip}
            >
              <AppText variant="label" color={colors.textPrimary}>
                {user ? initials(user) : '--'}
              </AppText>
              <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        }
      />

      {activeShift ? (
        <Card tone="success">
          <View style={styles.activeRow}>
            <View style={styles.activeCopy}>
              <Badge label="Shift running" tone="success" dot />
              <LiveTimer startIsoTimestamp={activeShift.startTime} running compact />
            </View>
            <Button
              label="Open"
              arrow
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={styles.openButton}
              onPress={() => router.push('/active')}
            />
          </View>
        </Card>
      ) : null}

      <WeekSwitcher
        weekStartKey={weekStartKey}
        isCurrentWeek={isCurrentWeek}
        onPrevious={() => void goToPreviousWeek()}
        onNext={() => void goToNextWeek()}
        onCurrent={() => void goToCurrentWeek()}
      />

      <Card>
        <View style={styles.summaryRow}>
          <StatTile label="Worked" value={formatDecimalHours(weekWorkedMinutes)} caption="this week" />
          <StatTile label="Shifts" value={String(shifts.length)} caption={isCurrentWeek ? 'current week' : 'selected week'} />
          <StatTile
            label="Breaks"
            value={formatMinutesAsDuration(totalBreakMinutes)}
            caption="unpaid"
          />
        </View>
      </Card>

      {status === 'error' && hasShifts && error ? (
        <ErrorBanner message={`${error.message} Showing cached results.`} tone="warning" />
      ) : null}

      {isInitialLoading ? <LoadingState label="Loading your shifts…" /> : null}

      {isInitialError && error ? (
        <ErrorState message={error.message} onRetry={() => void loadWeek()} />
      ) : null}

      {!isInitialLoading && !isInitialError && !hasShifts ? (
        <EmptyState
          title="No shifts for this week"
          description="Start a live shift or log one manually — it will show up here instantly."
          icon="calendar-outline"
          actionLabel="Add a shift"
          onAction={() => router.push('/create')}
        />
      ) : null}

      {hasShifts ? (
        <View style={styles.list}>
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              nowMs={nowMs}
              // A running shift is ended from the Active tab, not edited here.
              onPress={() => router.push(shift.endTime === null ? '/active' : `/edit/${shift.id}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  iconButtonPressed: {
    backgroundColor: colors.badgeFill,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  activeCopy: {
    gap: spacing.sm,
    flexShrink: 1,
  },
  openButton: {
    paddingHorizontal: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
