import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingData, validateOnboardingStep, getOnboardingProgress, getNextIncompleteStep } from '@/lib/onboarding-validation';

interface OnboardingProgressState {
  currentStep: number;
  totalSteps: number;
  progress: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDirty: boolean;
  savedData: OnboardingData | null;
}

const STORAGE_KEY = 'onboarding_progress';

export function useOnboardingProgress() {
  const { userProfile } = useAuth();
  const [state, setState] = useState<OnboardingProgressState>({
    currentStep: 1,
    totalSteps: userProfile?.user_role === 'client' ? 2 : 5,
    progress: 0,
    isValid: false,
    errors: [],
    warnings: [],
    isDirty: false,
    savedData: null,
  });

  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedData = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          savedData,
          currentStep: savedData.currentStep || 1,
          isDirty: false,
        }));
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
      }
    }
  }, []);

  // Update total steps when user role changes
  useEffect(() => {
    const totalSteps = userProfile?.user_role === 'client' ? 2 : 5;
    setState(prev => ({
      ...prev,
      totalSteps,
    }));
  }, [userProfile?.user_role]);

  // Save progress to localStorage
  const saveProgress = useCallback((data: OnboardingData, step: number) => {
    const progressData = {
      ...data,
      currentStep: step,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    setState(prev => ({
      ...prev,
      savedData: progressData,
      currentStep: step,
      isDirty: false,
    }));
  }, []);

  // Clear saved progress
  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(prev => ({
      ...prev,
      savedData: null,
      currentStep: 1,
      isDirty: false,
    }));
  }, []);

  // Validate current step
  const validateStep = useCallback((data: OnboardingData, step: number) => {
    if (!userProfile?.user_role) return { isValid: false, errors: ['No user role'], warnings: [] };
    
    const result = validateOnboardingStep(step, data, userProfile.user_role as any);
    
    setState(prev => ({
      ...prev,
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      isDirty: true,
    }));
    
    return result;
  }, [userProfile?.user_role]);

  // Update progress calculation
  const updateProgress = useCallback((data: OnboardingData) => {
    if (!userProfile?.user_role) return;
    
    const progress = getOnboardingProgress(data, userProfile.user_role as any);
    const nextIncompleteStep = getNextIncompleteStep(data, userProfile.user_role as any);
    
    setState(prev => ({
      ...prev,
      progress,
      currentStep: nextIncompleteStep,
    }));
  }, [userProfile?.user_role]);

  // Go to next step
  const nextStep = useCallback((data: OnboardingData) => {
    const result = validateStep(data, state.currentStep);
    
    if (result.isValid) {
      const nextStep = state.currentStep + 1;
      saveProgress(data, nextStep);
      setState(prev => ({
        ...prev,
        currentStep: nextStep,
      }));
      return true;
    }
    
    return false;
  }, [state.currentStep, validateStep, saveProgress]);

  // Go to previous step
  const previousStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  }, [state.currentStep]);

  // Go to specific step
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= state.totalSteps) {
      setState(prev => ({
        ...prev,
        currentStep: step,
      }));
    }
  }, [state.totalSteps]);

  // Check if step is accessible
  const isStepAccessible = useCallback((step: number) => {
    if (!userProfile?.user_role || !state.savedData) return step === 1;
    
    // Allow access to current step and previous steps
    return step <= state.currentStep;
  }, [userProfile?.user_role, state.savedData, state.currentStep]);

  // Get step completion status
  const getStepStatus = useCallback((step: number) => {
    if (!userProfile?.user_role || !state.savedData) {
      return step === 1 ? 'current' : 'locked';
    }
    
    if (step < state.currentStep) return 'completed';
    if (step === state.currentStep) return 'current';
    return 'locked';
  }, [userProfile?.user_role, state.savedData, state.currentStep]);

  // Auto-save data
  const autoSave = useCallback((data: OnboardingData) => {
    if (state.isDirty) {
      saveProgress(data, state.currentStep);
    }
  }, [state.isDirty, state.currentStep, saveProgress]);

  // Resume from saved progress
  const resumeFromSaved = useCallback(() => {
    if (state.savedData) {
      updateProgress(state.savedData);
      return state.savedData;
    }
    return null;
  }, [state.savedData, updateProgress]);

  return {
    ...state,
    validateStep,
    updateProgress,
    nextStep,
    previousStep,
    goToStep,
    isStepAccessible,
    getStepStatus,
    saveProgress,
    clearProgress,
    autoSave,
    resumeFromSaved,
  };
}
