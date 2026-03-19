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

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useOnboarding } from './useOnboarding';

// --- Test harness component (mirrors EventDetailScreen test pattern) ---
function TestHarness() {
  const { currentStep, isComplete, loading, setStep, completeOnboarding } = useOnboarding();
  return (
    <View>
      <Text testID="step">{String(currentStep)}</Text>
      <Text testID="complete">{String(isComplete)}</Text>
      <Text testID="loading">{String(loading)}</Text>
      <Pressable onPress={() => setStep(4)}><Text>SetStep4</Text></Pressable>
      <Pressable onPress={() => setStep(0)}><Text>SetStep0</Text></Pressable>
      <Pressable onPress={() => setStep(5)}><Text>SetStep5</Text></Pressable>
      <Pressable onPress={() => completeOnboarding()}><Text>Complete</Text></Pressable>
    </View>
  );
}

// --- Helpers ---
async function renderHarnessAndSettle() {
  const utils = render(<TestHarness />);
  await act(async () => {});
  await act(async () => {});
  return utils;
}

async function renderHookAndSettle() {
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
    mockSaveOnboardingStep.mockResolvedValue(undefined);
    mockMarkOnboardingComplete.mockResolvedValue(undefined);
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
      const { result } = await renderHookAndSettle();
      expect(result.current.loading).toBe(false);
    });

    it('loads saved step from storage', async () => {
      mockGetOnboardingStep.mockResolvedValue(3);
      const { result } = await renderHookAndSettle();
      expect(result.current.currentStep).toBe(3);
    });

    it('defaults to step 0 when no saved step', async () => {
      mockGetOnboardingStep.mockResolvedValue(null);
      const { result } = await renderHookAndSettle();
      expect(result.current.currentStep).toBe(0);
    });

    it('loads completion state from storage', async () => {
      mockIsOnboardingComplete.mockResolvedValue(true);
      const { result } = await renderHookAndSettle();
      expect(result.current.isComplete).toBe(true);
    });

    it('loads both step and completion in parallel', async () => {
      mockGetOnboardingStep.mockResolvedValue(2);
      mockIsOnboardingComplete.mockResolvedValue(false);
      const { result } = await renderHookAndSettle();
      expect(mockGetOnboardingStep).toHaveBeenCalled();
      expect(mockIsOnboardingComplete).toHaveBeenCalled();
      expect(result.current.currentStep).toBe(2);
      expect(result.current.isComplete).toBe(false);
    });

    it('handles storage error gracefully and stops loading', async () => {
      mockGetOnboardingStep.mockRejectedValue(new Error('Storage failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { result } = await renderHookAndSettle();
      expect(result.current.loading).toBe(false);
      expect(result.current.currentStep).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  // ─── setStep ────────────────────────────────────────────────────────

  describe('setStep', () => {
    it('saves step to storage and updates state', async () => {
      const { getByText, getByTestId } = await renderHarnessAndSettle();

      await act(async () => {
        fireEvent.press(getByText('SetStep4'));
      });
      await act(async () => {});

      expect(mockSaveOnboardingStep).toHaveBeenCalledWith(4);
      expect(getByTestId('step').props.children).toBe('4');
    });

    it('can set step to 0', async () => {
      mockGetOnboardingStep.mockResolvedValue(3);
      const { getByText, getByTestId } = await renderHarnessAndSettle();
      expect(getByTestId('step').props.children).toBe('3');

      await act(async () => {
        fireEvent.press(getByText('SetStep0'));
      });
      await act(async () => {});

      expect(mockSaveOnboardingStep).toHaveBeenCalledWith(0);
      expect(getByTestId('step').props.children).toBe('0');
    });

    it('handles save error gracefully', async () => {
      mockSaveOnboardingStep.mockRejectedValue(new Error('Write failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { getByText, getByTestId } = await renderHarnessAndSettle();

      await act(async () => {
        fireEvent.press(getByText('SetStep5'));
      });
      await act(async () => {});

      // Step should not update on error
      expect(getByTestId('step').props.children).toBe('0');
      consoleSpy.mockRestore();
    });
  });

  // ─── completeOnboarding ─────────────────────────────────────────────

  describe('completeOnboarding', () => {
    it('marks onboarding complete and resets step to 0', async () => {
      mockGetOnboardingStep.mockResolvedValue(3);
      const { getByText, getByTestId } = await renderHarnessAndSettle();
      expect(getByTestId('step').props.children).toBe('3');

      await act(async () => {
        fireEvent.press(getByText('Complete'));
      });
      await act(async () => {});

      expect(mockMarkOnboardingComplete).toHaveBeenCalled();
      expect(getByTestId('complete').props.children).toBe('true');
      expect(getByTestId('step').props.children).toBe('0');
    });

    it('handles complete error gracefully', async () => {
      mockMarkOnboardingComplete.mockRejectedValue(new Error('Complete failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { getByText, getByTestId } = await renderHarnessAndSettle();

      await act(async () => {
        fireEvent.press(getByText('Complete'));
      });
      await act(async () => {});

      // State should not change on error
      expect(getByTestId('complete').props.children).toBe('false');
      consoleSpy.mockRestore();
    });
  });
});
