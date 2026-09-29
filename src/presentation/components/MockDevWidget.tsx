import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MockErrorToggle } from './MockErrorToggle';
import { isMockDevToolsEnabled } from './mockDevTools';
import { haptics } from '../haptics';
import { borderWidth, colors, radius, shadow, spacing } from '../theme';

/** How far the handle's arrow nudges toward the screen interior. */
const NUDGE_DISTANCE = 4;

/** Vertical travel before a touch counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 4;

/** Keeps the handle clear of the screen header and the tab bar. */
const TOP_CLEARANCE = 64;
const BOTTOM_CLEARANCE = 96;

/** Distance the accessibility "move" actions shift the handle. */
const ACCESSIBILITY_STEP = 48;

/**
 * Floating, collapsible host for the mock API dev panel.
 *
 * Collapsed it renders a widget-like tab flush with the right edge; tapping it
 * slides the panel out from the side. The tab can also be dragged up and down
 * the edge so it never sits on top of a button, clamped to the usable vertical
 * band. A gentle looping nudge of the arrow (plus a pulsing status dot) signals
 * that the tab is interactive without being loud.
 *
 * Mounted once at the app root so there is a single instance across screens. The
 * overlay itself is `box-none`, so it never swallows touches meant for the UI
 * underneath.
 */
export function MockDevWidget() {
  const [expanded, setExpanded] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [nudge] = useState(() => new Animated.Value(0));
  const [panY] = useState(() => new Animated.Value(0));
  /** Committed vertical offset from the handle's centred resting position. */
  const [offsetY, setOffsetY] = useState(0);
  const [handleHeight, setHandleHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const available = isMockDevToolsEnabled();

  // The handle rests centred in the rail, so the travel available in each
  // direction is measured from the screen's midpoint.
  const maxOffset = Math.max(
    0,
    windowHeight / 2 - insets.bottom - BOTTOM_CLEARANCE - handleHeight / 2,
  );
  const minOffset = -Math.max(0, windowHeight / 2 - insets.top - TOP_CLEARANCE - handleHeight / 2);

  const settle = useCallback(
    (value: number): void => {
      const next = Math.min(maxOffset, Math.max(minOffset, value));
      if (next !== offsetY) {
        // Consistent with the rest of the app: a real change gets a tick.
        haptics.selection();
      }
      setOffsetY(next);
      Animated.spring(panY, {
        toValue: next,
        useNativeDriver: true,
        friction: 9,
        tension: 90,
      }).start();
    },
    [maxOffset, minOffset, offsetY, panY],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Claim the gesture only once the finger has actually moved vertically,
        // so a plain tap still reaches the Pressable and opens the panel.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > DRAG_THRESHOLD && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          panY.setValue(Math.min(maxOffset, Math.max(minOffset, offsetY + gesture.dy)));
        },
        onPanResponderRelease: (_event, gesture) => {
          settle(offsetY + gesture.dy);
        },
        onPanResponderTerminate: (_event, gesture) => {
          settle(offsetY + gesture.dy);
        },
      }),
    [maxOffset, minOffset, offsetY, panY, settle],
  );

  // Spring the panel in whenever it is opened.
  useEffect(() => {
    if (!available || !expanded) {
      return undefined;
    }

    progress.setValue(0);
    const animation = Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    });
    animation.start();
    return () => animation.stop();
  }, [available, expanded, progress]);

  // Subtle, looping "you can tap me" indicator on the collapsed handle.
  useEffect(() => {
    if (!available || expanded) {
      nudge.setValue(0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(nudge, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
      nudge.setValue(0);
    };
  }, [available, expanded, nudge]);

  const handleLayout = (event: LayoutChangeEvent): void => {
    setHandleHeight(event.nativeEvent.layout.height);
  };

  // Developer tooling is never shown in a release build with the real transport.
  if (!available) {
    return null;
  }

  const chevronShift = nudge.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -NUDGE_DISTANCE],
  });
  const dotOpacity = nudge.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });
  const panelShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });
  const panelScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  const openPanel = (): void => {
    haptics.selection();
    setExpanded(true);
  };

  const closePanel = (): void => {
    haptics.selection();
    setExpanded(false);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.rail} pointerEvents="box-none">
        {expanded ? (
          <Animated.View
            style={[
              styles.panelWrap,
              { opacity: progress, transform: [{ translateX: panelShift }, { scale: panelScale }] },
            ]}
          >
            <MockErrorToggle onCollapse={closePanel} />
          </Animated.View>
        ) : (
          <Animated.View
            onLayout={handleLayout}
            style={[styles.handleWrap, { transform: [{ translateY: panY }] }]}
            {...panResponder.panHandlers}
          >
            <Pressable
              onPress={openPanel}
              accessibilityRole="button"
              accessibilityLabel="Open mock API controls"
              accessibilityHint="Shows developer controls for simulating API failures. Drag, or use the move actions, to reposition it along the edge."
              accessibilityActions={[
                { name: 'increment', label: 'Move down' },
                { name: 'decrement', label: 'Move up' },
              ]}
              onAccessibilityAction={(event) => {
                const { actionName } = event.nativeEvent;
                if (actionName === 'increment') {
                  settle(offsetY + ACCESSIBILITY_STEP);
                } else if (actionName === 'decrement') {
                  settle(offsetY - ACCESSIBILITY_STEP);
                }
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.handle, pressed ? styles.handlePressed : null]}
            >
              <Animated.View style={{ transform: [{ translateX: chevronShift }] }}>
                <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
              </Animated.View>
              <Ionicons name="bug-outline" size={16} color={colors.textSecondary} />
              <View style={styles.grip} />
              <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
            </Pressable>
          </Animated.View>
        )}
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
    zIndex: 20,
  },
  rail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  panelWrap: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: spacing.xl,
  },
  handleWrap: {
    alignItems: 'flex-end',
  },
  handle: {
    width: 40,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: borderWidth.hairline,
    borderRightWidth: 0,
    borderColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    ...shadow.raised,
  },
  handlePressed: {
    backgroundColor: colors.badgeFill,
  },
  /** Grab affordance: signals the tab can be dragged along the edge. */
  grip: {
    width: 16,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  dot: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.sm,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.live,
  },
});
