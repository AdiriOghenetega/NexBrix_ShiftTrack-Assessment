import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { container } from '@/infrastructure/appContainer';
import { FeatureTourOverlay, MockDevWidget } from '@/presentation/components';
import {
  selectIsAuthenticated,
  selectIsRestoring,
  useAuthStore,
  useTourStore,
} from '@/presentation/store';
import { colors } from '@/presentation/theme';

void SplashScreen.preventAutoHideAsync();

/** NexBrix light navigation theme (`#FAFAFA` canvas, white cards, charcoal ink). */
const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.live,
  },
};

export default function RootLayout() {
  const isRestoring = useAuthStore(selectIsRestoring);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const handleSessionExpired = useAuthStore((state) => state.handleSessionExpired);
  const checkAndAutoStartTour = useTourStore((state) => state.checkAndAutoStart);
  const cancelTour = useTourStore((state) => state.cancelTour);
  const isTourActive = useTourStore((state) => state.isActive);

  // Restore the encrypted session once, on cold start.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // A rejected session (401) must sign the user out rather than trap them in a
  // retry loop. The transport reports it here so infrastructure never has to
  // import the store.
  useEffect(() => {
    container.setUnauthorizedHandler(() => {
      void handleSessionExpired();
    });
    return () => container.setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  // Keep the native splash up until we know whether we have a session, so the
  // user never sees a login/dashboard flicker.
  useEffect(() => {
    if (!isRestoring) {
      void SplashScreen.hideAsync();
    }
  }, [isRestoring]);

  // Offer the feature tour once per install, the first time a session is active.
  useEffect(() => {
    if (isAuthenticated) {
      void checkAndAutoStartTour();
    }
  }, [isAuthenticated, checkAndAutoStartTour]);

  // A session ending must never strand the tour on top of the login screen.
  useEffect(() => {
    if (!isAuthenticated && isTourActive) {
      cancelTour();
    }
  }, [isAuthenticated, isTourActive, cancelTour]);

  if (isRestoring) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <View style={styles.appRoot}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(app)" />
              {/* Pushed over the tabs, so the user is focused on one shift. */}
              <Stack.Screen name="edit/[id]" />
            </Stack.Protected>

            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>

          {/* Floating, collapsible dev panel. Renders nothing in a release build. */}
          <MockDevWidget />
          {/* First-run coach marks. Renders nothing once seen or dismissed. */}
          <FeatureTourOverlay />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
