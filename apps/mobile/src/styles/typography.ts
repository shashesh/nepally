/**
 * Nepally Typography Scale
 * Based on Design System Foundation v1.0
 * Platform-specific fonts: San Francisco (iOS) / Roboto (Android)
 * @see docs/wireframes/00-design-system-foundation.md
 */

import { TextStyle } from 'react-native';

/**
 * Platform-specific font families
 */
export const fontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
} as const;

/**
 * Typography styles following platform conventions
 */
export const typography = {
  // Headers
  h1: {
    fontSize: 34,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    lineHeight: 41,
    letterSpacing: 0.37,
  } as TextStyle,

  h2: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    lineHeight: 34,
    letterSpacing: 0.36,
  } as TextStyle,

  h3: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    lineHeight: 28,
    letterSpacing: 0.35,
  } as TextStyle,

  // Body Text
  body: {
    fontSize: 17,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: 22,
    letterSpacing: -0.41,
  } as TextStyle,

  // Caption
  caption: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: 18,
    letterSpacing: -0.08,
  } as TextStyle,

  // Button Text
  button: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.41,
    textTransform: 'none',
  } as TextStyle,

  // Input Text
  input: {
    fontSize: 17,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: 22,
    letterSpacing: -0.41,
  } as TextStyle,

  // Label
  label: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: fontFamily.regular,
    lineHeight: 18,
    letterSpacing: -0.08,
  } as TextStyle,
} as const;

export type Typography = typeof typography;
