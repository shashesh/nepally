import { Platform, Dimensions } from 'react-native';

/**
 * Platform-specific utility functions
 */

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/**
 * Get platform-specific value
 */
export function select<T>(options: { ios: T; android: T }): T {
  return Platform.select(options) as T;
}

/**
 * Get screen dimensions
 */
export function getScreenDimensions() {
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

/**
 * Check if screen is small (iPhone SE, etc.)
 */
export function isSmallScreen(): boolean {
  const { width, height } = getScreenDimensions();
  return width <= 375 && height <= 667;
}

/**
 * Get platform-specific button text transformation
 */
export function getButtonTextTransform(): 'uppercase' | 'none' {
  return isAndroid ? 'uppercase' : 'none';
}

/**
 * Get platform-specific touch feedback type
 */
export function getTouchFeedbackType(): 'opacity' | 'highlight' {
  return isIOS ? 'opacity' : 'highlight';
}

/**
 * Get platform-specific keyboard type
 */
export function getNumericKeyboardType(): 'number-pad' | 'numeric' {
  return isIOS ? 'number-pad' : 'numeric';
}

/**
 * Check if device has notch (iPhone X and later)
 */
export function hasNotch(): boolean {
  if (!isIOS) return false;

  const { height, width } = getScreenDimensions();

  // iPhone X, XS, 11 Pro: 812
  // iPhone XR, 11: 896
  // iPhone 12, 13 Pro: 844
  // iPhone 12 Pro Max, 13 Pro Max: 926
  const notchHeights = [812, 896, 844, 926];

  return notchHeights.includes(height) || notchHeights.includes(width);
}

/**
 * Get safe area insets (approximate)
 */
export function getSafeAreaInsets() {
  if (hasNotch()) {
    return {
      top: 44,
      bottom: 34,
    };
  }

  return {
    top: isIOS ? 20 : 0,
    bottom: 0,
  };
}
