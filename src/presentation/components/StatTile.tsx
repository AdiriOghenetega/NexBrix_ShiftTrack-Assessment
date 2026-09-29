import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { colors, spacing } from '../theme';

export interface StatTileProps {
  readonly label: string;
  readonly value: string;
  readonly caption?: string;
  readonly valueColor?: string;
}

/** Compact metric tile used in the dashboard summary row. */
export function StatTile({ label, value, caption, valueColor = colors.textPrimary }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <AppText variant="overline">{label}</AppText>
      <AppText variant="heading" color={valueColor}>
        {value}
      </AppText>
      {caption ? <AppText variant="caption">{caption}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: spacing.xxs,
  },
});
