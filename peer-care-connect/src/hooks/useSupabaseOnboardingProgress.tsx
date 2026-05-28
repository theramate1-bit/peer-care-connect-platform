import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  formData: any;
  completedSteps: number[];
  lastSavedAt: string | null;
}

export function useSupabaseOnboardingProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load progress from Supabase on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    loadProgress();
  }, [user?.id]);

  const loadProgress = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading onboarding progress:', error);
        return;
      }

      if (data) {
        console.log('📥 Loaded onboarding progress from database:', data);
        setProgress({
          currentStep: data.current_step,
          totalSteps: data.total_steps,
          formData: data.form_data || {},
          completedSteps: data.completed_steps || [],
          lastSavedAt: data.last_saved_at,
        });
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = useCallback(async (
    currentStep: number,
    formData: any,
    completedSteps: number[] = []
  ) => {
    if (!user?.id) return;

    try {
      setSaving(true);
      
      const progressData = {
        user_id: user.id,
        current_step: currentStep,
        total_steps: 6, // Practitioner onboarding has 6 steps
        form_data: formData,
        completed_steps: completedSteps,
      };

      console.log('💾 Saving onboarding progress to database:', progressData);

      const { data, error } = await supabase
        .from('onboarding_progress')
        .upsert(progressData, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving onboarding progress:', error);
        toast.error('Failed to save progress');
        return false;
      }

      console.log('✅ Progress saved successfully');
      setProgress({
        currentStep: data.current_step,
        totalSteps: data.total_steps,
        formData: data.form_data,
        completedSteps: data.completed_steps,
        lastSavedAt: data.last_saved_at,
      });

      return true;
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const clearProgress = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🗑️ Clearing onboarding progress');
      
      const { error } = await supabase
        .from('onboarding_progress')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing onboarding progress:', error);
        return false;
      }

      console.log('✅ Progress cleared successfully');
      setProgress(null);
      return true;
    } catch (error) {
      console.error('Failed to clear onboarding progress:', error);
      return false;
    }
  }, [user?.id]);

  const hasProgress = progress !== null && progress.currentStep > 1;

  return {
    progress,
    loading,
    saving,
    hasProgress,
    saveProgress,
    clearProgress,
    loadProgress,
  };
}

