import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => mockAsyncStorage
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import {
  getActiveLocation,
  getOnboardingStep,
  getPermissionBannerState,
  isOnboardingComplete,
  markOnboardingComplete,
  saveActiveLocation,
  saveOnboardingStep,
  savePermissionBannerState,
} from './storage';

describe('storage utils', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('saves and reads onboarding step', async () => {
    await saveOnboardingStep(3);

    const step = await getOnboardingStep();

    expect(step).toBe(3);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ONBOARDING_STEP, '3');
  });

  it('marks onboarding complete and removes step', async () => {
    await saveOnboardingStep(2);
    await markOnboardingComplete();

    await expect(isOnboardingComplete()).resolves.toBe(true);
    await expect(getOnboardingStep()).resolves.toBeNull();
  });

  it('saves and reads active location', async () => {
    const location = {
      metro_area_id: '19100',
      metro_name: 'Dallas-Fort Worth-Arlington',
      metro_state: 'TX',
      source: 'saved' as const,
      is_temporary: false,
    };

    await saveActiveLocation(location);

    await expect(getActiveLocation()).resolves.toEqual(location);
  });

  it('returns default permission banner state when none exists', async () => {
    await expect(getPermissionBannerState()).resolves.toEqual({
      show_count: 0,
      last_shown_at: null,
    });
  });

  it('saves and reads permission banner state', async () => {
    const state = { show_count: 2, last_shown_at: '2026-02-24T00:00:00.000Z' };

    await savePermissionBannerState(state);

    await expect(getPermissionBannerState()).resolves.toEqual(state);
  });
});
