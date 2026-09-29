import { colors, palette, colorScheme } from './colors';
import type { ColorSchemeName, ColorToken } from './colors';
import { borderWidth, duration, layout, opacity, radius, shadow, spacing } from './spacing';
import { fontFamily, fontSize, fontWeight, letterSpacing, textStyles } from './typography';
import type { TextVariant } from './typography';

export { colors, palette, colorScheme };
export type { ColorSchemeName, ColorToken };
export { borderWidth, duration, layout, opacity, radius, shadow, spacing };
export { fontFamily, fontSize, fontWeight, letterSpacing, textStyles };
export type { TextVariant };

/** Single import surface for screens: `import { theme } from '@/presentation/theme';` */
export const theme = {
  colors,
  spacing,
  radius,
  borderWidth,
  opacity,
  shadow,
  layout,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  text: textStyles,
} as const;
