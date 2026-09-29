import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Badge } from './Badge';
import { formatTimer } from '@/core/utils/time';
import { colors, radius, spacing } from '../theme';
import { useElapsedTimer } from '../hooks/useElapsedTimer';

export interface LiveTimerProps {
  readonly startIsoTimestamp: string | null;
  readonly running: boolean;
  readonly compact?: boolean;
}

/** Big monospaced HH:MM:SS readout driven by `useElapsedTimer`. */
export function LiveTimer({ startIsoTimestamp, running, compact = false }: LiveTimerProps) {
  const elapsedMs = useElapsedTimer(startIsoTimestamp, running);

  return (
    <View style={styles.container}>
      <AppText variant={compact ? 'title' : 'timer'} style={styles.readout}>
        {formatTimer(elapsedMs)}
      </AppText>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: running ? colors.live : colors.textMuted }]} />
        <AppText variant="caption">
          {running ? 'Live · recalculated from start time' : 'Paused'}
        </AppText>
      </View>
      {elapsedMs === 0 && !running ? (
        <Badge label="No active shift" tone="neutral" icon="moon-outline" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  readout: {
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
});
