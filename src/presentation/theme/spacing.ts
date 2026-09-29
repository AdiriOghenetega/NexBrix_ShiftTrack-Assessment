/** Spacing, radius, shadow and timing tokens. */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  /** Rounded card corners (`20`). */
  card: 20,
  /** Input corners (`16`). */
  input: 16,
  xl: 20,
  /** Fully pill-shaped buttons and badges. */
  pill: 9999,
} as const;

export const borderWidth = {
  hairline: 1,
  thick: 2,
} as const;

export const opacity = {
  pressed: 0.72,
  disabled: 0.5,
  muted: 0.6,
} as const;

export const duration = {
  fast: 120,
  normal: 220,
} as const;

export const layout = {
  screenPaddingX: spacing.xl,
  /** Inner padding of `Card`; also the bleed used by full-width content inside one. */
  cardPadding: spacing.xl,
  maxContentWidth: 640,
  tabBarHeight: 58,
} as const;

/**
 * Soft, low-opacity light-mode elevation.
 *
 * Shadows use near-black at very low opacity so cards read as "lifted paper"
 * on the `#FAFAFA` canvas without the heavy dark-mode halo.
 */
export const shadow = {
  card: {
    shadowColor: '#09090B',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#09090B',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  /** Depth under the dark pill CTA. */
  button: {
    shadowColor: '#09090B',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;
