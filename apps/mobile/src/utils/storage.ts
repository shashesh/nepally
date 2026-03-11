import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import type { ActiveLocation, LocationSnooze, PermissionBannerState } from '@nusa/shared';

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
export async function saveUserData(userData: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

/**
 * Get user data
 */
export async function getUserData<T = unknown>(): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? (JSON.parse(data) as T) : null;
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

// ── Location Management ──────────────────────────────────────

/**
 * Save the active location (what the feed shows)
 */
export async function saveActiveLocation(location: ActiveLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_LOCATION, JSON.stringify(location));
  } catch (error) {
    console.error('Failed to save active location:', error);
  }
}

/**
 * Get the active location
 */
export async function getActiveLocation(): Promise<ActiveLocation | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_LOCATION);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get active location:', error);
    return null;
  }
}

/**
 * Clear the active location
 */
export async function clearActiveLocation(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_LOCATION);
  } catch (error) {
    console.error('Failed to clear active location:', error);
  }
}

/**
 * Save location snooze entries
 */
export async function saveLocationSnoozes(snoozes: LocationSnooze[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_SNOOZES, JSON.stringify(snoozes));
  } catch (error) {
    console.error('Failed to save location snoozes:', error);
  }
}

/**
 * Get location snooze entries
 */
export async function getLocationSnoozes(): Promise<LocationSnooze[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_SNOOZES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get location snoozes:', error);
    return [];
  }
}

/**
 * Save permission banner state
 */
export async function savePermissionBannerState(state: PermissionBannerState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_BANNER_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save permission banner state:', error);
  }
}

/**
 * Get permission banner state
 */
export async function getPermissionBannerState(): Promise<PermissionBannerState> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PERMISSION_BANNER_STATE);
    return data ? JSON.parse(data) : { show_count: 0, last_shown_at: null };
  } catch (error) {
    console.error('Failed to get permission banner state:', error);
    return { show_count: 0, last_shown_at: null };
  }
}

// ── Post Draft ───────────────────────────────────────────────

/**
 * Post draft key prefix
 */
const POST_DRAFT_KEY = '@nusa:post_draft';

/**
 * Shape of a persisted post draft
 */
export interface PostDraft {
  title: string;
  body: string;
  selectedTagIds: string[];
  isGlobal: boolean;
  savedAt: string; // ISO timestamp
}

/**
 * Save a post draft (new post only – not used for editing existing posts)
 */
export async function savePostDraft(draft: PostDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(POST_DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save post draft:', error);
  }
}

/**
 * Load the saved post draft, if any
 */
export async function loadPostDraft(): Promise<PostDraft | null> {
  try {
    const data = await AsyncStorage.getItem(POST_DRAFT_KEY);
    return data ? (JSON.parse(data) as PostDraft) : null;
  } catch (error) {
    console.error('Failed to load post draft:', error);
    return null;
  }
}

/**
 * Clear the saved post draft
 */
export async function clearPostDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(POST_DRAFT_KEY);
  } catch (error) {
    console.error('Failed to clear post draft:', error);
  }
}
