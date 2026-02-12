/**
 * NUSA Spacing System (8pt Grid)
 * Based on Design System Foundation v1.0
 * All values are multiples of 8 for consistency
 * @see docs/wireframes/00-design-system-foundation.md
 */

export const spacing = {
  xxs: 4,  // Tight spacing, icon padding
  xs: 8,   // Small gaps, list item padding
  s: 16,   // Default spacing between elements
  m: 24,   // Section spacing
  l: 32,   // Screen padding, major sections
  xl: 48,  // Hero elements, onboarding
} as const;

/**
 * Border radius values
 */
export const borderRadius = {
  button: 8,
  card: 12,
  input: 8,
  badge: 16,
  modal: 12, // Use static value for both platforms
} as const;

/**
 * Component heights - Using Android sizes (larger) for better touch targets
 */
export const heights = {
  button: {
    primary: 56,
    secondary: 56,
  },
  input: 56,
  banner: 72,
  tabBar: 56,
  navigationBar: 56,
} as const;

/**
 * Touch targets (minimum tappable area)
 */
export const touchTargets = {
  minimum: 48,
  recommended: 56,
} as const;

/**
 * Shadow/Elevation styles
 * Using elevation for both platforms (works on iOS too)
 */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Heights = typeof heights;
export type TouchTargets = typeof touchTargets;
export type Shadows = typeof shadows;
