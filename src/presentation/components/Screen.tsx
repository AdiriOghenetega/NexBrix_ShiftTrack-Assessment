import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '../theme';

export interface ScreenProps {
  readonly children: ReactNode;
  /** Wraps the content in a ScrollView (default) or a plain View. */
  readonly scroll?: boolean;
  readonly refreshing?: boolean;
  readonly onRefresh?: () => void;
  readonly keyboardAware?: boolean;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly style?: StyleProp<ViewStyle>;
  readonly edges?: readonly ('top' | 'bottom' | 'left' | 'right')[];
}

/** Common screen shell: dark canvas, safe areas, optional scroll + pull-to-refresh. */
export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  keyboardAware = false,
  contentStyle,
  style,
  edges = ['top', 'left', 'right'],
}: ScreenProps) {
  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh
          ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.card}
              />
            )
          : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={[...edges]}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.maxContentWidth,
  },
});
