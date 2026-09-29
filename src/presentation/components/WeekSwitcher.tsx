import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { haptics } from '../haptics';
import { colors, opacity, radius, shadow, spacing } from '../theme';
import { formatWeekRangeLabel } from '@/core/utils/time';

export interface WeekSwitcherProps {
  readonly weekStartKey: string;
  readonly isCurrentWeek: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onCurrent: () => void;
}

/** Week navigation header for the weekly shifts dashboard. */
export function WeekSwitcher({ weekStartKey, isCurrentWeek, onPrevious, onNext, onCurrent }: WeekSwitcherProps) {
  return (
    <View style={styles.container}>
      <IconButton icon="chevron-back" label="Previous week" onPress={onPrevious} />

      <View style={styles.labelWrap}>
        <AppText variant="overline">{isCurrentWeek ? 'This week' : 'Week of'}</AppText>
        <AppText variant="subheading" align="center">
          {formatWeekRangeLabel(weekStartKey)}
        </AppText>
        {!isCurrentWeek ? (
          <Pressable
            onPress={() => {
              haptics.selection();
              onCurrent();
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <AppText variant="caption" color={colors.textPrimary}>
              Jump to this week
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <IconButton icon="chevron-forward" label="Next week" onPress={onNext} disabled={isCurrentWeek} />
    </View>
  );
}

interface IconButtonProps {
  readonly icon: 'chevron-back' | 'chevron-forward';
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

function IconButton({ icon, label, onPress, disabled = false }: IconButtonProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && !disabled ? styles.iconButtonPressed : null,
        disabled ? { opacity: opacity.disabled } : null,
      ]}
    >
      <Ionicons name={icon} size={18} color={disabled ? colors.textMuted : colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  labelWrap: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  iconButton: {
    width: 42,
    height: 42,
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
    borderColor: colors.borderStrong,
  },
});
