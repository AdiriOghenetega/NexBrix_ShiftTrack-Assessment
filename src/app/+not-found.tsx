import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppText, Button, EmptyState, Screen } from '@/presentation/components';
import { spacing } from '@/presentation/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <EmptyState
        title="Screen not found"
        description="That route does not exist in ShiftTrack."
        icon="compass-outline"
      />
      <Button label="Back to my week" icon="arrow-back" onPress={() => router.replace('/')} />
      <AppText variant="caption" align="center">
        If this came from a deep link, check the URL scheme.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: spacing.lg,
  },
});
