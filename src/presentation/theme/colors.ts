/**
 * NexBrix design language — colour tokens (light mode).
 *
 * Off-white canvas, pure-white zinc-bordered cards, charcoal typography and a
 * near-black "dark pill" primary action, with mint emerald reserved for live /
 * active shift indicators. Matches the palette used on nexbrix.com.au.
 *
 * Naming is semantic (not literal), so screens and components never hardcode a
 * hex value — retheming means editing this file only.
 */

export const palette = {
  /** Off-white app canvas. */
  canvas: '#FAFAFA',
  /** Pure white surfaces. */
  white: '#FFFFFF',
  /** Subtle fills: badges, chips, pressed states, hairline dividers. */
  zinc100: '#F4F4F5',
  /** Default border. */
  zinc200: '#E4E4E7',
  /** Stronger border for focused inputs and pressed outlines. */
  zinc300: '#D4D4D8',
  /** Subtle / placeholder text. */
  zinc400: '#A1A1AA',
  /** Secondary / muted text. */
  zinc500: '#71717A',
  /** Deep charcoal used by primary actions and headings. */
  zinc900: '#18181B',
  /** Text primary. */
  ink: '#111111',
  /** Shadow colour. */
  shadow: '#09090B',
  /** Status live / active accent. */
  mint: '#10B981',
  /** Mint shade that stays readable as text on white. */
  mintDeep: '#047857',
  amber: '#F59E0B',
  red: '#DC2626',
} as const;

export const colors = {
  // ------------------------------------------------------------------ canvas
  /** Screen background (`#FAFAFA`). */
  background: palette.canvas,
  /** Alias kept for grouped/inset surfaces. */
  backgroundElevated: palette.canvas,
  /** Card / sheet background (`#FFFFFF`). */
  card: palette.white,
  /** Recessed fill for chips and inset rows (`#F4F4F5`). */
  cardMuted: palette.zinc100,
  /** Input background — white with a hairline border. */
  input: palette.white,
  /** Badge fill. */
  badgeFill: palette.zinc100,

  // ----------------------------------------------------------------- borders
  border: palette.zinc200,
  borderSubtle: palette.zinc100,
  borderStrong: palette.zinc300,

  // ------------------------------------------------------- primary (dark pill)
  /** Primary action background (`#18181B`). */
  primary: palette.zinc900,
  primaryPressed: '#27272A',
  /** Primary action disabled (`#71717A`). */
  primaryDisabled: palette.zinc500,
  /** Neutral chip fill used for accent surfaces. */
  primarySoft: palette.zinc100,
  primaryBorder: palette.zinc200,
  textOnPrimary: palette.white,

  // ----------------------------------------------------- secondary (outlined)
  secondaryBackground: palette.white,
  secondaryBorder: palette.zinc200,
  secondaryText: palette.zinc900,

  // ------------------------------------------------------- status: live/active
  /** Live / active indicator (`#10B981`) — dots, fills, accents. */
  live: palette.mint,
  success: palette.mint,
  successPressed: '#059669',
  /** Readable mint for text on a white background. */
  successText: palette.mintDeep,
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  textOnSuccess: '#04231A',

  warning: palette.amber,
  warningText: '#B45309',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',

  danger: palette.red,
  dangerSoft: '#FEF2F2',
  dangerPressed: '#FEE2E2',
  dangerBorder: '#FECACA',

  // -------------------------------------------------------------------- text
  /** `#111111` */
  textPrimary: palette.ink,
  /** `#71717A` */
  textSecondary: palette.zinc500,
  /** `#A1A1AA` */
  textMuted: palette.zinc400,
  textInverse: palette.white,

  // -------------------------------------------------------------- chrome/UI
  tabBar: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: palette.zinc200,
  scrim: 'rgba(17, 17, 17, 0.4)',
  placeholder: palette.zinc400,
  shadow: palette.shadow,
} as const;

export type ColorToken = keyof typeof colors;

export type ColorSchemeName = 'nexbrix-light';

export const colorScheme: ColorSchemeName = 'nexbrix-light';
