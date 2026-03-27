/**
 * Nepally Color Palette
 * Based on Design System Foundation v1.0
 * @see docs/wireframes/00-design-system-foundation.md
 */

export const colors = {
  // Primary Colors
  primary: {
    main: '#1565C0', // Deep Blue - Trust & stability
    pressed: '#104D99', // 10% darker for pressed state
    light: '#E3F2FD', // Light blue for backgrounds
  },

  // Accent Colors
  accent: {
    red: '#DC143C', // Crimson Red - from Nepal flag
  },

  // Supporting Colors
  success: '#2E7D32', // Forest Green
  warning: '#F57C00', // Amber
  error: '#C62828', // Error Red

  // Neutral Grays
  background: '#F5F5F5', // Light Gray
  text: {
    primary: '#212121', // Almost Black
    secondary: '#757575', // Medium Gray
    tertiary: '#9E9E9E',
    disabled: '#BDBDBD', // Light Gray for disabled
  },
  border: '#E0E0E0', // Light Gray
  surfaceMuted: '#F5F5F5',

  // Component-Specific Colors
  banner: {
    level0: {
      background: '#FFF3E0', // Light Amber
      text: '#E65100', // Dark Amber
    },
  },

  // Badge Colors
  badge: {
    level0: '#757575', // Gray
    level1: '#2E7D32', // Green
    level2: '#1565C0', // Blue
    localBg: '#E8F5E9',
    localText: '#388E3C',
    globalBg: '#E3F2FD',
    globalText: '#1565C0',
    active: '#4CAF50', // Bright Green
    expired: '#F44336', // Bright Red
  },

  // Utility Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayMedium: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.1)',
} as const;

export type Colors = typeof colors;
