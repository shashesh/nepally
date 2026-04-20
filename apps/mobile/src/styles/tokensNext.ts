/**
 * Nepally Design System — NEXT (pilot tokens, mobile)
 *
 * Source of truth: .impeccable.md (Design Context) at the repo root, and the
 * web sidecar at apps/web/src/styles/design-system-next.css.
 *
 * These tokens run alongside the existing `colors`, `typography`, `spacing`
 * exports without overriding them. Only screens that explicitly import from
 * `tokensNext` get the new look; everything else is untouched. Pilot scope
 * is the public profile view.
 *
 * OKLCH is the source-of-truth color space (see web sidecar). React Native's
 * StyleSheet does not accept `oklch()` at runtime, so every color below has
 * been hand-converted to its sRGB hex equivalent. If you need to adjust a
 * color, edit the OKLCH value in `.impeccable.md` first, then re-derive the
 * hex here.
 *
 * ## Fonts (TODO — scaffolded only)
 *
 * The brand fonts are Gambarino (display) + Switzer (body) from Fontshare.
 * Mobile requires local .ttf/.otf files loaded via expo-font. Until those
 * files are dropped into `apps/mobile/assets/fonts/`, the sidecar falls back
 * to 'System' so the layout is correct and the only thing missing is the
 * typographic character.
 *
 * To enable the real fonts:
 *   1. Download Gambarino-Regular.otf + Switzer-Regular/Medium/Semibold/Bold
 *      from https://www.fontshare.com and place in apps/mobile/assets/fonts/
 *   2. Register them in App.tsx with `useFonts({ 'Gambarino-Regular': require(...), ... })`
 *   3. Set the `NEXT_FONTS_LOADED` flag below to true (or wire it dynamically)
 *
 * See `apps/mobile/assets/fonts/README.md` for the full checklist.
 */

import { type TextStyle } from 'react-native';

// Flip to `true` once the font files have been downloaded and registered in App.tsx.
const NEXT_FONTS_LOADED = false;

const DISPLAY_FALLBACK = 'System';
const BODY_FALLBACK = 'System';

export const nextFonts = {
  display: NEXT_FONTS_LOADED ? 'Gambarino-Regular' : DISPLAY_FALLBACK,
  body: NEXT_FONTS_LOADED ? 'Switzer-Regular' : BODY_FALLBACK,
  bodyMedium: NEXT_FONTS_LOADED ? 'Switzer-Medium' : BODY_FALLBACK,
  bodySemibold: NEXT_FONTS_LOADED ? 'Switzer-Semibold' : BODY_FALLBACK,
  bodyBold: NEXT_FONTS_LOADED ? 'Switzer-Bold' : BODY_FALLBACK,
} as const;

/**
 * 4pt spacing scale (matches web sidecar `--next-space-*`).
 */
export const nextSpace = {
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  xxxxl: 96,
} as const;

/**
 * Fixed type scale (product UI — not marketing).
 * Line-heights set for warm readability on phone screens at 10pm.
 */
export const nextType = {
  xs: { fontSize: 13, lineHeight: 18 } satisfies TextStyle,
  sm: { fontSize: 15, lineHeight: 22 } satisfies TextStyle,
  base: { fontSize: 17, lineHeight: 26 } satisfies TextStyle,
  lg: { fontSize: 19, lineHeight: 28 } satisfies TextStyle,
  xl: { fontSize: 22, lineHeight: 30 } satisfies TextStyle,
  // Display is used for the profile display name only. Clamp is not a thing
  // in RN StyleSheet, so pick one size; the screen can override if needed.
  display: { fontSize: 34, lineHeight: 40 } satisfies TextStyle,
} as const;

type NextColorTokens = {
  surface0: string;
  surface1: string;
  surface2: string;
  surfaceSunken: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  borderSubtle: string;
  borderSolid: string;

  crimson: string;
  crimsonHover: string;
  crimsonInk: string;
  crimsonTint: string;

  moss: string;
  mossTint: string;
  ink: string;

  trustNewFg: string;
  trustNewBg: string;
  trustVerifiedFg: string;
  trustVerifiedBg: string;
  trustContributorFg: string;
  trustContributorBg: string;

  buttonOnCrimson: string;
};

/**
 * Light theme — warm off-whites tinted toward crimson (hue 25).
 * Hand-converted from OKLCH source-of-truth.
 */
const lightColors: NextColorTokens = {
  surface0: '#FBF9F7',
  surface1: '#FFFFFF',
  surface2: '#F4F0EE',
  surfaceSunken: '#EEE9E6',

  textPrimary: '#211916',
  textSecondary: '#6D5F58',
  textTertiary: '#988680',

  borderSubtle: '#E7E1DE',
  borderSolid: '#D6CDC8',

  crimson: '#C12130',
  crimsonHover: '#A91625',
  crimsonInk: '#8B1A22',
  crimsonTint: '#F9E8E8',

  moss: '#4F7B61',
  mossTint: '#E9F1EB',
  ink: '#3F485E',

  trustNewFg: '#5E504A',
  trustNewBg: '#EEE8E5',
  trustVerifiedFg: '#3D5E4A',
  trustVerifiedBg: '#E9F1EB',
  trustContributorFg: '#8B1A22',
  trustContributorBg: '#F9E8E8',

  buttonOnCrimson: '#FBF5F3',
};

/**
 * Dark theme — warm near-blacks tinted toward crimson. Designed from scratch,
 * not inverted from light.
 */
const darkColors: NextColorTokens = {
  surface0: '#211A18',
  surface1: '#2A2220',
  surface2: '#332B28',
  surfaceSunken: '#1B1513',

  textPrimary: '#F4F1EF',
  textSecondary: '#B3A9A4',
  textTertiary: '#897E78',

  borderSubtle: '#362E2B',
  borderSolid: '#433833',

  crimson: '#E86577',
  crimsonHover: '#F07D8B',
  crimsonInk: '#F7A6B0',
  crimsonTint: '#3D2220',

  moss: '#90C3A5',
  mossTint: '#263D30',
  ink: '#C0C8DC',

  trustNewFg: '#B3A9A4',
  trustNewBg: '#2F2724',
  trustVerifiedFg: '#A9D4B9',
  trustVerifiedBg: '#263D30',
  trustContributorFg: '#F0B0B8',
  trustContributorBg: '#3D2220',

  buttonOnCrimson: '#1B0F0D',
};

/**
 * React hook — returns the active theme token set.
 *
 * **Currently forced to light** because the rest of the Nepally mobile app
 * has no dark mode; following the OS scheme here would make only the public
 * profile dark and out of place on devices in dark mode.
 *
 * Dark tokens (`nextColorsDark`) are still defined and ready to use once
 * product-wide dark mode lands. To re-enable OS-following dark, restore:
 *
 *   import { useColorScheme } from 'react-native';
 *   const scheme = useColorScheme();
 *   return scheme === 'dark' ? darkColors : lightColors;
 */
export function useNextColors(): NextColorTokens {
  return lightColors;
}

/**
 * Static accessors for non-hook contexts (e.g., StyleSheet.create() at module
 * load). Prefer `useNextColors()` inside components so dark mode works; use
 * these only for values that don't change with theme.
 */
export const nextColorsLight = lightColors;
export const nextColorsDark = darkColors;

export type NextColors = NextColorTokens;
