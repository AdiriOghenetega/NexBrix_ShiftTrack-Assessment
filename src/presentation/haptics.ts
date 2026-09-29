/**
 * Haptic feedback facade.
 *
 * Keeps the rest of the UI free of platform branching and of `expo-haptics`
 * specifics. Two rules matter here:
 *
 *  1. On Android the docs explicitly discourage the Vibrator-based
 *     `impactAsync`/`notificationAsync` in favour of `performAndroidHapticsAsync`,
 *     so each intent maps to a platform-appropriate effect.
 *  2. Every call is fire-and-forget and swallows failures. Haptics are a nicety:
 *     unsupported hardware, a disabled Taptic Engine, Low Power Mode or a
 *     missing VIBRATE permission must never surface an error or delay a tap.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';

interface Effect {
  /** Semantic equivalent on Android (no VIBRATE permission required). */
  readonly android: Haptics.AndroidHaptics;
  /** iOS / web implementation. */
  readonly trigger: () => Promise<void>;
}

function fire(effect: Effect): void {
  const run = Platform.OS === 'android'
    ? () => Haptics.performAndroidHapticsAsync(effect.android)
    : effect.trigger;

  void run().catch(() => {
    // Intentionally ignored — see the module doc comment.
  });
}

const IMPACT: Record<HapticImpactStyle, Effect> = {
  light: {
    android: Haptics.AndroidHaptics.Virtual_Key,
    trigger: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  },
  medium: {
    android: Haptics.AndroidHaptics.Context_Click,
    trigger: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  },
  heavy: {
    android: Haptics.AndroidHaptics.Long_Press,
    trigger: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  },
};

export const haptics = {
  /** A discrete selection changed: tabs, week stepper, toggles, step changes. */
  selection(): void {
    fire({
      android: Haptics.AndroidHaptics.Segment_Tick,
      trigger: () => Haptics.selectionAsync(),
    });
  },

  /** A button was pressed. Weighted by the importance of the action. */
  impact(style: HapticImpactStyle = 'light'): void {
    fire(IMPACT[style]);
  },

  /** An operation completed: sign-in, shift clocked off, shift saved. */
  success(): void {
    fire({
      android: Haptics.AndroidHaptics.Confirm,
      trigger: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    });
  },

  /** An operation failed: rejected credentials, a failed request. */
  error(): void {
    fire({
      android: Haptics.AndroidHaptics.Reject,
      trigger: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    });
  },
} as const;
