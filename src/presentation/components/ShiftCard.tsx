import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Badge } from './Badge';
import { Card } from './Card';
import type { Shift } from '@/core/entities/Shift';
import { formatClockTime, formatDayLabel, formatMinutesAsDuration, workedDurationMinutes } from '@/core/utils/time';
import { haptics } from '../haptics';
import { colors, spacing } from '../theme';

export interface ShiftCardProps {
  readonly shift: Shift;
  /** Passed in so a single screen-level timer drives every card. */
  readonly nowMs: number;
  /** When provided the card becomes a tap target (opens the shift). */
  readonly onPress?: () => void;
}

/** One row of the weekly shift list. */
export function ShiftCard({ shift, nowMs, onPress }: ShiftCardProps) {
  const isActive = shift.endTime === null;
  const workedMinutes = workedDurationMinutes(shift.startTime, shift.endTime, shift.breakMinutes, nowMs);

  const content = (
    <Card tone={isActive ? 'success' : 'default'} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <AppText variant="subheading">{formatDayLabel(shift.startTime)}</AppText>
          <AppText variant="caption">
            {formatClockTime(shift.startTime)} – {isActive ? 'running' : formatClockTime(shift.endTime ?? shift.startTime)}
          </AppText>
        </View>
        <View style={styles.headerMeta}>
          <AppText variant="heading" color={isActive ? colors.successText : colors.textPrimary}>
            {formatMinutesAsDuration(workedMinutes)}
          </AppText>
          <AppText variant="caption">worked</AppText>
        </View>
        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textMuted}
            style={styles.chevron}
          />
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {isActive ? (
          <Badge label="Active" tone="success" dot />
        ) : (
          <Badge label="Completed" tone="neutral" dot />
        )}
        <Badge label={`Break ${shift.breakMinutes}m`} tone="primary" icon="cafe-outline" />
      </View>

      {shift.note ? (
        <AppText variant="label" style={styles.note}>
          {shift.note}
        </AppText>
      ) : null}
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={() => {
        haptics.impact('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${formatDayLabel(shift.startTime)} shift, ${formatClockTime(shift.startTime)} to ${
        isActive ? 'running' : formatClockTime(shift.endTime ?? shift.startTime)
      }`}
      accessibilityHint="Opens this shift"
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  card: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    gap: spacing.xxs,
    flexShrink: 1,
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  chevron: {
    alignSelf: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  note: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
