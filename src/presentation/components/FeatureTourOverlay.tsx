import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { haptics } from '../haptics';
import { useTourStore } from '../store/useTourStore';
import { borderWidth, colors, radius, spacing } from '../theme';

/**
 * Lightweight coach-mark overlay for the feature tour.
 *
 * Dims the app, follows the active step's screen so the user sees the feature
 * being described, and shows one short card at a time. It is deliberately
 * data-driven (see `../tour/tourSteps`) and dependency-free — no tour library.
 */
export function FeatureTourOverlay() {
  const router = useRouter();

  const isActive = useTourStore((state) => state.isActive);
  const stepIndex = useTourStore((state) => state.stepIndex);
  const steps = useTourStore((state) => state.steps);
  const nextStep = useTourStore((state) => state.nextStep);
  const previousStep = useTourStore((state) => state.previousStep);
  const dismissTour = useTourStore((state) => state.dismissTour);

  const [progress] = useState(() => new Animated.Value(0));

  const step = steps[stepIndex];
  const isLastStep = stepIndex >= steps.length - 1;

  // Show the screen a step refers to, so the copy matches what is on screen.
  useEffect(() => {
    if (!isActive || !step) {
      return;
    }
    router.navigate(step.route);
  }, [isActive, step, router]);

  // Replay a short entrance motion on every step change.
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [isActive, stepIndex, progress]);

  if (!isActive || !step) {
    return null;
  }

  const cardShift = progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={styles.overlay} pointerEvents="box-none" testID="feature-tour">
      {/* Blocks interaction with the app so the tour stays on rails. */}
      <View style={styles.scrim} />

      <View style={styles.bottomRail} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[styles.cardWrap, { opacity: progress, transform: [{ translateY: cardShift }] }]}
        >
          <Card elevated style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.iconChip}>
                <Ionicons name={step.icon} size={16} color={colors.textPrimary} />
              </View>
              <AppText variant="overline" style={styles.stepLabel}>
                Step {stepIndex + 1} of {steps.length}
              </AppText>
              <Pressable
                onPress={() => {
                  haptics.selection();
                  void dismissTour();
                }}
                accessibilityRole="button"
                accessibilityLabel="Skip the feature tour"
                hitSlop={10}
              >
                <AppText variant="caption" color={colors.textSecondary}>
                  Skip
                </AppText>
              </Pressable>
            </View>

            <View style={styles.copy}>
              <AppText variant="heading">{step.title}</AppText>
              <AppText variant="label">{step.description}</AppText>
            </View>

            <View style={styles.dots} accessibilityElementsHidden>
              {steps.map((tourStep, index) => (
                <View
                  key={tourStep.id}
                  style={[styles.dot, index === stepIndex ? styles.dotActive : null]}
                />
              ))}
            </View>

            <View style={styles.actions}>
              {stepIndex > 0 ? (
                <Button
                  label="Back"
                  variant="secondary"
                  onPress={previousStep}
                  fullWidth={false}
                  style={styles.actionButton}
                />
              ) : null}
              <Button
                label={isLastStep ? 'Finish' : 'Next'}
                arrow={!isLastStep}
                icon={isLastStep ? 'checkmark' : undefined}
                onPress={() => void nextStep()}
                fullWidth={false}
                style={styles.actionButton}
                testID="feature-tour-next"
              />
            </View>
          </Card>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Above the mock dev widget (zIndex 20) so the tour always wins.
    zIndex: 30,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  bottomRail: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    // Clears the tab bar so the card never covers the tour's own subject.
    paddingBottom: 104,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 520,
  },
  card: {
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.badgeFill,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
  },
  stepLabel: {
    flex: 1,
  },
  copy: {
    gap: spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.xxl,
  },
});
