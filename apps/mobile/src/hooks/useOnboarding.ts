import { useState, useEffect, useCallback } from 'react';
import {
  saveOnboardingStep,
  getOnboardingStep,
  markOnboardingComplete,
  isOnboardingComplete as checkOnboardingComplete,
} from '../utils/storage';

interface UseOnboardingReturn {
  currentStep: number;
  isComplete: boolean;
  loading: boolean;
  setStep: (step: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

/**
 * Hook for managing onboarding progress
 */
export function useOnboarding(): UseOnboardingReturn {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Load onboarding state on mount
  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    try {
      const [step, complete] = await Promise.all([
        getOnboardingStep(),
        checkOnboardingComplete(),
      ]);

      setCurrentStep(step || 0);
      setIsComplete(complete);
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    } finally {
      setLoading(false);
    }
  };

  const setStep = useCallback(async (step: number) => {
    try {
      await saveOnboardingStep(step);
      setCurrentStep(step);
    } catch (error) {
      console.error('Failed to save onboarding step:', error);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await markOnboardingComplete();
      setIsComplete(true);
      setCurrentStep(0);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, []);

  return {
    currentStep,
    isComplete,
    loading,
    setStep,
    completeOnboarding,
  };
}
