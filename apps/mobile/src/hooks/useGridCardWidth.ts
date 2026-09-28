import { useWindowDimensions } from 'react-native';

/** The width of one card in a two-column grid with a gutter on each side and between. */
export function gridCardWidth(windowWidth: number, gutter: number): number {
  return Math.floor((windowWidth - gutter * 3) / 2);
}

/**
 * Two-column card width that follows the window, so rotation, iPad Split View
 * and Stage Manager re-flow the grid (the app sets supportsTablet).
 */
export function useGridCardWidth(gutter: number): number {
  const { width } = useWindowDimensions();
  return gridCardWidth(width, gutter);
}
