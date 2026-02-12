import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';

/**
 * AsyncStorage utility functions
 * Provides type-safe storage operations
 */

/**
 * Save onboarding step progress
 */
export async function saveOnboardingStep(step: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, step.toString());
  } catch (error) {
    console.error('Failed to save onboarding step:', error);
  }
}

/**
 * Get current onboarding step
 */
export async function getOnboardingStep(): Promise<number | null> {
  try {
    const step = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_STEP);
    return step ? parseInt(step, 10) : null;
  } catch (error) {
    console.error('Failed to get onboarding step:', error);
    return null;
  }
}

/**
 * Mark onboarding as complete
 */
export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_STEP);
  } catch (error) {
    console.error('Failed to mark onboarding complete:', error);
  }
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    return false;
  }
}

/**
 * Save banner dismissed state
 */
export async function saveBannerDismissed(bannerId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.BANNER_DISMISSED}_${bannerId}`, 'true');
  } catch (error) {
    console.error('Failed to save banner dismissed:', error);
  }
}

/**
 * Check if banner was dismissed
 */
export async function isBannerDismissed(bannerId: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(`${STORAGE_KEYS.BANNER_DISMISSED}_${bannerId}`);
    return value === 'true';
  } catch (error) {
    console.error('Failed to check banner dismissed:', error);
    return false;
  }
}

/**
 * Save user data
 */
export async function saveUserData(userData: any): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

/**
 * Get user data
 */
export async function getUserData(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

/**
 * Clear all app data
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Failed to clear all data:', error);
  }
}

/**
 * Save metro area data
 */
export async function saveMetroArea(metroArea: {
  id: string;
  name: string;
  state: string;
}): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.METRO_AREA, JSON.stringify(metroArea));
  } catch (error) {
    console.error('Failed to save metro area:', error);
  }
}

/**
 * Get saved metro area
 */
export async function getMetroArea(): Promise<{
  id: string;
  name: string;
  state: string;
} | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.METRO_AREA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get metro area:', error);
    return null;
  }
}
