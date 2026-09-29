import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getEmailError, getPasswordError } from '@/core/validation/shiftValidation';
import { DEMO_CREDENTIALS } from '@/infrastructure/api/mockDatabase';
import {
  AppText,
  Button,
  Card,
  ErrorBanner,
  Screen,
  TextField,
} from '@/presentation/components';
import { selectIsSigningIn, useAuthStore } from '@/presentation/store';
import { haptics } from '@/presentation/haptics';
import { colors, radius, shadow, spacing } from '@/presentation/theme';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const clearError = useAuthStore((state) => state.clearError);
  const authError = useAuthStore((state) => state.error);
  const isSigningIn = useAuthStore(selectIsSigningIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const applyErrors = (next: FieldErrors): void => {
    setFieldErrors(next);
  };

  const handleSignIn = async (): Promise<void> => {
    // Guard against double submits from rapid taps / keyboard return.
    if (isSigningIn) {
      return;
    }

    clearError();

    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);
    if (emailError || passwordError) {
      applyErrors({
        ...(emailError ? { email: emailError } : {}),
        ...(passwordError ? { password: passwordError } : {}),
      });
      return;
    }

    applyErrors({});

    const signedIn = await signIn(email.trim(), password);
    if (signedIn) {
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const fillDemoCredentials = (): void => {
    haptics.selection();
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    applyErrors({});
    clearError();
  };

  return (
    <Screen keyboardAware contentStyle={styles.content}>
      <View style={styles.brandBlock}>
        <View style={styles.logoMark}>
          <Ionicons name="time-outline" size={26} color={colors.textInverse} />
        </View>
        <View style={styles.brandCopy}>
          <AppText variant="display">ShiftTrack</AppText>
          <AppText variant="label" align="center">
            Rosters, live hours and timesheets for NexBrix teams.
          </AppText>
        </View>
      </View>

      <Card elevated>
        <View style={styles.cardHeader}>
          <AppText variant="heading">Staff sign in</AppText>
          <AppText variant="label">Use your NexBrix work account to continue.</AppText>
        </View>

        {authError ? (
          <ErrorBanner message={authError.message} tone="error" onDismiss={clearError} />
        ) : null}

        <TextField
          label="Email"
          prefixIcon="mail-outline"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldErrors.email) {
              applyErrors({ ...fieldErrors, email: undefined });
            }
          }}
          placeholder="you@nexbrix.com.au"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!isSigningIn}
          error={fieldErrors.email}
        />

        <TextField
          label="Password"
          prefixIcon="lock-closed-outline"
          labelAccessory={
            <Pressable
              onPress={() => {
                haptics.selection();
                setShowPassword((value) => !value);
              }}
              accessibilityRole="button"
              hitSlop={8}
            >
              <AppText variant="caption" color={colors.textPrimary}>
                {showPassword ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          }
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (fieldErrors.password) {
              applyErrors({ ...fieldErrors, password: undefined });
            }
          }}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="go"
          editable={!isSigningIn}
          onSubmitEditing={() => {
            void handleSignIn();
          }}
          error={fieldErrors.password}
        />

        <Button
          label={isSigningIn ? 'Signing in…' : 'Sign in'}
          arrow
          onPress={() => {
            void handleSignIn();
          }}
          loading={isSigningIn}
          disabled={isSigningIn}
          testID="login-submit"
        />

        <Pressable
          onPress={fillDemoCredentials}
          accessibilityRole="button"
          style={styles.demoRow}
          disabled={isSigningIn}
        >
          <Ionicons name="sparkles-outline" size={14} color={colors.textSecondary} />
          <AppText variant="caption">
            Use demo credentials — {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
          </AppText>
        </Pressable>
      </Card>

      <AppText variant="caption" align="center" style={styles.footer}>
        Sessions are stored in the iOS Keychain / Android Keystore via Expo SecureStore.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.huge,
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadow.button,
  },
  brandCopy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardHeader: {
    gap: spacing.xxs,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});
