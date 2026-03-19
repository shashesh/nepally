import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockGetOnboardingStep = jest.fn().mockResolvedValue(null);
const mockIsOnboardingComplete = jest.fn().mockResolvedValue(false);
const mockSaveOnboardingStep = jest.fn().mockResolvedValue(undefined);
const mockMarkOnboardingComplete = jest.fn().mockResolvedValue(undefined);

jest.mock('../utils/storage', () => ({
  getOnboardingStep: (...args: unknown[]) => mockGetOnboardingStep(...args),
  isOnboardingComplete: (...args: unknown[]) => mockIsOnboardingComplete(...args),
  saveOnboardingStep: (...args: unknown[]) => mockSaveOnboardingStep(...args),
  markOnboardingComplete: (...args: unknown[]) => mockMarkOnboardingComplete(...args),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useOnboarding } from './useOnboarding';

// --- Helpers ---
async function renderAndSettle() {
  const result = renderHook(() => useOnboarding());
  await act(async () => {});
  await act(async () => {});
  return result;
}

describe('useOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOnboardingStep.mockResolvedValue(null);
    mockIsOnboardingComplete.mockResolvedValue(false);
  });

  // ─── Initial State & Loading ────────────────────────────────────────

  describe('initial state and loading', () => {
    it('starts with loading true', () => {
      mockGetOnboardingStep.mockReturnValue(new Promise(() => {}));
      mockIsOnboardingComplete.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useOnboarding());
      expect(result.current.loading).toBe(true);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.isComplete).toBe(false);
    });

    it('sets loading to false after state loads', async () => {
      const { result } = await renderAndSettle();
      expect(result.current.loading).toBe(false);
    });

    it('loads saved step from storage', async () => {
      mockGetOnboardingStep.mockResolvedValue(3);
      const { result } = await renderAndSettle();
      expect(result.current.currentStep).toBe(3);
    });

    it('defaults to step 0 when no saved step', async () => {
      mockGetOnboardingStep.mockResolvedValue(null);
      const { result } = await renderAndSettle();
      expect(result.current.currentStep).toBe(0);
    });

    it('loads completion state from storage', async () => {
      mockIsOnboardingComplete.mockResolvedValue(true);
      const { result } = await renderAndSettle();
      expect(result.current.isComplete).toBe(true);
    });

    it('loads both step and completion in parallel', async () => {
      mockGetOnboardingStep.mockResolvedValue(2);
      mockIsOnboardingComplete.mockResolvedValue(false);
      const { result } = await renderAndSettle();
      expect(mockGetOnboardingStep).toHaveBeenCalled();
      expect(mockIsOnboardingComplete).toHaveBeenCalled();
      expect(result.current.currentStep).toBe(2);
      expect(result.current.isComplete).toBe(false);
    });

    it('handles storage error gracefully and stops loading', async () => {
      mockGetOnboardingStep.mockRejectedValue(new Error('Storage failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = await renderAndSettle();
      expect(result.current.loading).toBe(false);
      expect(result.current.currentStep).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  // ─── setStep ────────────────────────────────────────────────────────

  describe('setStep', () => {
    it('saves step to storage and updates state', async () => {
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.setStep(4);
      });
      await act(async () => {});

      expect(mockSaveOnboardingStep).toHaveBeenCalledWith(4);
      expect(result.current.currentStep).toBe(4);
    });

    it('can set step to 0', async () => {
      mockGetOnboardingStep.mockResolvedValue(3);
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.setStep(0);
      });
      await act(async () => {});

      expect(mockSaveOnboardingStep).toHaveBeenCalledWith(0);
      expect(result.current.currentStep).toBe(0);
    });

    it('handles save error gracefully', async () => {
      mockSaveOnboardingStep.mockRejectedValue(new Error('Write failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.setStep(5);
      });
      await act(async () => {});

      // Step should not update on error
      expect(result.current.currentStep).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  // ─── completeOnboarding ─────────────────────────────────────────────

  describe('completeOnboarding', () => {
    it('marks onboarding complete and resets step to 0', async () => {
      mockGetOnboardingStep.mockResolvedValue(3);
      const { result } = await renderAndSettle();
      expect(result.current.currentStep).toBe(3);

      await act(async () => {
        result.current.completeOnboarding();
      });
      await act(async () => {});

      expect(mockMarkOnboardingComplete).toHaveBeenCalled();
      expect(result.current.isComplete).toBe(true);
      expect(result.current.currentStep).toBe(0);
    });

    it('handles complete error gracefully', async () => {
      mockMarkOnboardingComplete.mockRejectedValue(new Error('Complete failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = await renderAndSettle();

      await act(async () => {
        result.current.completeOnboarding();
      });
      await act(async () => {});

      // State should not change on error
      expect(result.current.isComplete).toBe(false);
      consoleSpy.mockRestore();
    });
  });
});
