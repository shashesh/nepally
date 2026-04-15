/**
 * Warm Community tokens for the marketplace surface.
 *
 * These are additive extensions to styles/colors.ts and styles/spacing.ts.
 * They MUST NOT replace existing tokens — other screens still rely on them.
 * Only the marketplace screens consume these.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const warmSurface = {
  canvas: '#FBF7F1',   // warm off-white screen background
  card: '#FFFFFF',     // card surface pops against canvas
} as const;

export const warmAccent = {
  warm: '#C8451C',       // terracotta — price, filled save heart, active tab underline
  warmPressed: '#A63814',
  warmSoft: '#F4E3DC',   // chip background for category dots on soft surfaces
} as const;

export const warmBorder = {
  hairline: 'rgba(20,14,8,0.08)',
} as const;

export const warmRadius = {
  card: 14,
  tile: 10,
  sheet: 20,
} as const;

export const warmShadow: ViewStyle = {
  shadowColor: '#140E08',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const warmDisplaySm: TextStyle = {
  fontSize: 16,
  fontWeight: '700',
  letterSpacing: -0.2,
};
