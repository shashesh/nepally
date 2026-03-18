import { act, renderHook } from '@testing-library/react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => mockAsyncStorage
);

import * as storage from '../utils/storage';
import { useOnboarding } from './useOnboarding';

describe('useOnboarding', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(storage, 'getOnboardingStep').mockResolvedValue(2);
    jest.spyOn(storage, 'isOnboardingComplete').mockResolvedValue(false);
    jest.spyOn(storage, 'saveOnboardingStep').mockResolvedValue(undefined);
    jest.spyOn(storage, 'markOnboardingComplete').mockResolvedValue(undefined);
  });

  it('loads onboarding state on mount', async () => {
    const { result } = renderHook(() => useOnboarding());

    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.currentStep).toBe(2);
    expect(result.current.isComplete).toBe(false);
  });

  it('updates onboarding step with setStep', async () => {
    const { result } = renderHook(() => useOnboarding());

    await act(async () => {});

    await act(async () => {
      await result.current.setStep(4);
    });

    expect(storage.saveOnboardingStep).toHaveBeenCalledWith(4);
    expect(result.current.currentStep).toBe(4);
  });

  it('marks onboarding complete and resets step', async () => {
    const { result } = renderHook(() => useOnboarding());

    await act(async () => {});

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(storage.markOnboardingComplete).toHaveBeenCalled();
    expect(result.current.isComplete).toBe(true);
    expect(result.current.currentStep).toBe(0);
  });
});
