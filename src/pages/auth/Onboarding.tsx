import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { User as UserIcon, CheckCircle, LogOut, AlertCircle, Loader2, Check, Shield, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { completePractitionerOnboarding, completeClientOnboarding, validateOnboardingData, markOnboardingInProgress } from '@/lib/onboarding-utils';
import { SubscriptionSelection } from '@/components/onboarding/SubscriptionSelection';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UserRole } from '@/types/roles';
import { Analytics } from '@/lib/analytics';
import { useRealtime } from '@/contexts/RealtimeContext';
import SmartLocationPicker from '@/components/ui/SmartLocationPicker';
import SmartPhonePicker from '@/components/ui/SmartPhonePicker';
import { useSupabaseOnboardingProgress } from '@/hooks/useSupabaseOnboardingProgress';
import { Building2, Car, Building } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { onboardingFadeVariants, onboardingSpring, onboardingStepVariants } from '@/components/onboarding/onboarding-motion';
import { validateDetailedStreetAddress } from '@/lib/address-validation';

const PaymentSetupStep = lazy(() => import('@/components/onboarding/PaymentSetupStep'));

// Step constants for practitioner onboarding - SIMPLIFIED FLOW
const PRACTITIONER_STEPS = {
  THERAPIST_TYPE: 0,
  BASIC_INFO: 1,
  LOCATION: 2,
  RADIUS: 3,
  STRIPE_CONNECT: 4,
  SUBSCRIPTION: 5
} as const;

const ValidationErrorDisplay = React.memo(({ errors }: { errors: Record<string, string> }) => {
  if (Object.keys(errors).length === 0) return null;
  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center mb-2">
        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
        <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
      </div>
      <ul className="text-sm text-red-700 space-y-1">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field} className="flex items-center">
            <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
            <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}: {error}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

ValidationErrorDisplay.displayName = 'ValidationErrorDisplay';

/**
 * Determines the actual step based on form data completeness.
 * This ensures that saved progress matches the actual state of form completion.
 */
const getActualStepFromFormData = (formData: any, savedStep: number): number => {
  // Step 0: Therapist Type - check if therapistType is set
  if (!formData.therapistType) return PRACTITIONER_STEPS.THERAPIST_TYPE;
  
  // Step 1: Basic Info - check if firstName, lastName, phone are set
  if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.phone?.trim()) {
    return PRACTITIONER_STEPS.BASIC_INFO;
  }
  
  // Step 2: Location - check if location data is set based on therapistType
  if (formData.therapistType === 'clinic_based' && !formData.clinicAddress?.trim()) {
    return PRACTITIONER_STEPS.LOCATION;
  }
  if (formData.therapistType === 'mobile' && !formData.baseAddress?.trim()) {
    return PRACTITIONER_STEPS.LOCATION;
  }
  if (formData.therapistType === 'mobile' && !validateDetailedStreetAddress(formData.baseAddress).isValid) {
    return PRACTITIONER_STEPS.LOCATION;
  }
  if (formData.therapistType === 'hybrid' && (!formData.clinicAddress?.trim() || !formData.baseAddress?.trim())) {
    return PRACTITIONER_STEPS.LOCATION;
  }
  if (formData.therapistType === 'hybrid' && !validateDetailedStreetAddress(formData.baseAddress).isValid) {
    return PRACTITIONER_STEPS.LOCATION;
  }
  
  // Step 3: Radius - only for mobile/hybrid, check if radius is set
  if ((formData.therapistType === 'mobile' || formData.therapistType === 'hybrid') && !formData.mobileServiceRadiusKm) {
    return PRACTITIONER_STEPS.RADIUS;
  }
  
  // Return the saved step if all previous steps are complete
  return Math.min(savedStep, 5);
};

const Onboarding = () => {
  const { user, userProfile, updateProfile, refreshProfile, signOut, loading: authLoading, profileLoading } = useAuth();
  const { subscribed, subscriptionTier, checkSubscription } = useSubscription();
  const realtime = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();
  const { progress, loading: progressLoading, saving: progressSaving, hasProgress, saveProgress, clearProgress, loadProgress } = useSupabaseOnboardingProgress();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stepProcessing, setStepProcessing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false); // Track successful saves
  const [subscriptionCompleted, setSubscriptionCompleted] = useState(false);
  const [subscriptionVerifying, setSubscriptionVerifying] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  
  // Simplified form data - removed fields moved to profile setup
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    // Removed: bio, experience_years, specializations, qualifications, etc.
    // Client-specific fields
    firstName: '',
    lastName: '',
    // Location data
    latitude: null as number | null,
    longitude: null as number | null,
    // Liability insurance
    hasLiabilityInsurance: false,
    // Therapist type selection
    therapistType: null as 'clinic_based' | 'mobile' | 'hybrid' | null,
    // Clinic address (for clinic-based and hybrid)
    clinicAddress: '',
    clinicLatitude: null as number | null,
    clinicLongitude: null as number | null,
    // Base address (for mobile and hybrid)
    baseAddress: '',
    baseLatitude: null as number | null,
    baseLongitude: null as number | null,
    // Service radius (for mobile and hybrid)
    mobileServiceRadiusKm: 25,
    // Structured primary address fields (for clinic/base)
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressCounty: '',
    addressPostcode: '',
    addressCountry: 'GB',
  });

  // SINGLE SOURCE OF TRUTH: Get role from userProfile first, then URL params, then localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const roleFromUrl = urlParams.get('intendedRole') || urlParams.get('role'); // support ?role=client and ?intendedRole=client
  const localStorageRole = localStorage.getItem('selectedRole');
  const roleSelectionTime = localStorage.getItem('roleSelectionTimestamp');
  const isRecentRoleSelection = roleSelectionTime && (Date.now() - parseInt(roleSelectionTime)) < 300000; // 5 minutes

  // Resolved profile: use real profile when loaded, or minimal from session when we have role from URL (so client onboarding isn't stuck)
  const resolvedProfile = useMemo(() => {
    if (userProfile) return userProfile;
    if (user && roleFromUrl) {
      return {
        id: user.id,
        email: user.email ?? '',
        first_name: (user.user_metadata as Record<string, unknown>)?.first_name as string ?? 'User',
        last_name: (user.user_metadata as Record<string, unknown>)?.last_name as string ?? 'User',
        user_role: (roleFromUrl === 'client' ? 'client' : roleFromUrl) as 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'admin' | null ?? null,
        onboarding_status: 'pending' as const,
        profile_completed: false,
      };
    }
    return null;
  }, [userProfile, user, roleFromUrl]);

  // Priority: resolvedProfile.user_role > URL params > recent localStorage
  const effectiveRole = resolvedProfile?.user_role || roleFromUrl || (isRecentRoleSelection ? localStorageRole : null);

  // Refs to prevent infinite loops from replaceState
  const stripeStateProcessedRef = useRef<boolean>(false);
  const urlParamsProcessedRef = useRef<boolean>(false);
  const progressCorrectedRef = useRef<boolean>(false);

  // Detect navigation from Stripe Connect completion and force progress reload
  useEffect(() => {
    const state = location.state as { stripeConnectComplete?: boolean; timestamp?: number } | null;
    
    if (!state?.stripeConnectComplete) {
      stripeStateProcessedRef.current = false;
      return;
    }
    
    if (stripeStateProcessedRef.current) return;
    
    if (state?.stripeConnectComplete && state?.timestamp) {
      const recentThreshold = 5000; // 5 seconds
      if (Date.now() - state.timestamp < recentThreshold) {
        console.log('🔄 Reloading progress after Stripe Connect completion');
        stripeStateProcessedRef.current = true;
        loadProgress();
        const currentPath = window.location.pathname;
        navigate(currentPath, { replace: true, state: {} });
      }
    }
  }, [location.state, loadProgress, navigate]);

  // Auto-resume saved progress
  useEffect(() => {
    if (!progressLoading && hasProgress && effectiveRole !== 'client' && effectiveRole !== null && progress) {
      // Prevent multiple corrections
      if (progressCorrectedRef.current) return;
      
      console.log('✅ Auto-resuming from saved progress:', progress);
      
      // Validate that saved step matches form data
      const actualStep = getActualStepFromFormData(progress.formData, progress.currentStep);
      const safeStep = Math.min(actualStep, 5);
      
      // Only restore if step is valid
      if (actualStep !== progress.currentStep) {
        console.warn(`⚠️ Step mismatch detected. Saved: ${progress.currentStep}, Actual: ${actualStep}. Correcting...`);
        progressCorrectedRef.current = true;
        // Update progress with corrected step to prevent future mismatches
        saveProgress(actualStep, progress.formData, progress.completedSteps || []).catch(err => {
          console.error('Failed to update corrected progress:', err);
          progressCorrectedRef.current = false; // Reset on error so we can try again
        });
      }
      
      setStep(safeStep);
      
      // Filter out any obsolete fields from saved progress
      const safeFormData = { ...progress.formData };
      setFormData(prev => ({ ...prev, ...safeFormData }));
      
      if (safeStep > 0) {
        toast.success('Welcome back! Your progress has been restored.', {
          duration: 3000,
        });
      }
    }
  }, [progressLoading, hasProgress, effectiveRole, progress, saveProgress]);

  // Mark onboarding as 'in_progress' when user enters the onboarding page
  // This ensures we have a clear state transition: pending -> in_progress -> completed
  // And helps diagnose issues where completion fails
  const inProgressMarkedRef = useRef<boolean>(false);
  useEffect(() => {
    // Only mark in_progress once per session, and only for practitioners
    if (inProgressMarkedRef.current) return;
    if (!resolvedProfile?.id) return;
    if (effectiveRole === 'client' || effectiveRole === null) return;
    if (resolvedProfile.onboarding_status === 'completed') return; // Don't overwrite completed status
    
    // Mark as in_progress to track that user has started onboarding
    inProgressMarkedRef.current = true;
    markOnboardingInProgress(resolvedProfile.id).then(({ error }) => {
      if (error) {
        console.warn('Could not mark onboarding as in_progress:', error);
      } else {
        console.log('✅ Onboarding marked as in_progress for tracking');
      }
    });
  }, [resolvedProfile?.id, resolvedProfile?.onboarding_status, effectiveRole]);

  // Handle return from Stripe Connect onboarding
  useEffect(() => {
    if (effectiveRole === 'client' || effectiveRole === null) {
      urlParamsProcessedRef.current = false;
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const connectComplete = urlParams.get('connect_complete');
    const accountId = urlParams.get('account_id');
    
    if (!connectComplete || !accountId) {
      urlParamsProcessedRef.current = false;
      return;
    }
    
    if (urlParamsProcessedRef.current) return;
    
    // Check if we are on the stripe step (now step 4)
    if (connectComplete === 'true' && accountId && step === PRACTITIONER_STEPS.STRIPE_CONNECT) {
      console.log('✅ Returning from Stripe Connect onboarding');
      urlParamsProcessedRef.current = true;
      
      const checkConnectStatus = async () => {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('stripe_connect_account_id')
            .eq('id', resolvedProfile?.id)
            .single();
          
          if (userData?.stripe_connect_account_id) {
            await refreshProfile();
            toast.success('Stripe Connect setup complete!');
            const currentPath = window.location.pathname;
            navigate(currentPath, { replace: true });
          } else {
            toast.warning('Stripe Connect setup not complete. Please try again.');
            urlParamsProcessedRef.current = false;
          }
        } catch (error) {
          console.error('Error verifying Stripe Connect:', error);
          toast.error('Could not verify Stripe Connect status');
          urlParamsProcessedRef.current = false;
        }
      };
      
      checkConnectStatus();
    }
  }, [step, effectiveRole, resolvedProfile?.id, refreshProfile, navigate]);

  // Field validation function
  const validateField = useCallback((fieldName: string, value: any) => {
    const errors: Record<string, string> = {};
    
    switch (fieldName) {
      case 'firstName':
        if (!value?.trim()) errors.firstName = 'First name is required';
        break;
      case 'lastName':
        if (!value?.trim()) errors.lastName = 'Last name is required';
        break;
      case 'phone':
        if (!value?.trim()) errors.phone = 'Phone number is required';
        else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(value)) {
          errors.phone = 'Please enter a valid phone number';
        }
        break;
      case 'location':
        if (!value?.trim()) errors.location = 'Location is required';
        break;
    }
    
    return errors;
  }, []);

  // Handle field changes with real-time validation
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    const fieldErrors = validateField(fieldName, value);
    if (Object.keys(fieldErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...fieldErrors }));
    }
  }, [validateField]);

  const handleLocationSelect = useCallback((lat: number, lon: number, address: string) => {
    // This is a fallback handler - specific handlers (handleClinicLocationSelect, handleBaseLocationSelect) 
    // should be used for clinic and base addresses
    setFormData(prev => ({
      ...prev,
      location: address,
      latitude: lat,
      longitude: lon
    }));
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.location;
      return newErrors;
    });
  }, []);

  const handleClinicAddressChange = useCallback((address: string) => {
      setFormData(prev => ({
        ...prev,
      clinicAddress: address,
      location: address, // Also update location for backward compatibility
    }));

    // Clear validation errors immediately when user types
      setValidationErrors(prev => {
        const next = { ...prev };
      if (address && address.trim().length > 0) {
        delete next.clinicAddress;
        delete next.location;
      }
        return next;
      });
  }, []);

  const handleClinicLocationSelect = useCallback((lat: number, lon: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      clinicAddress: address,
      clinicLatitude: lat,
      clinicLongitude: lon,
      location: address,
      latitude: lat,
      longitude: lon,
    }));

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.clinicAddress;
      delete next.location;
      return next;
    });
  }, []);

  const handleBaseAddressChange = useCallback((address: string) => {
      setFormData(prev => ({
        ...prev,
      baseAddress: address,
      location: prev.therapistType === 'mobile' ? address : prev.location,
    }));

    // Clear validation errors immediately when user types
      setValidationErrors(prevErrors => {
        const next = { ...prevErrors };
      if (address && address.trim().length > 0) {
        delete next.baseAddress;
        delete next.location;
      }
        return next;
      });
  }, []);

  const handleBaseLocationSelect = useCallback((lat: number, lon: number, address: string) => {
    setFormData(prev => ({
      ...prev,
      baseAddress: address,
      baseLatitude: lat,
      baseLongitude: lon,
      location: prev.therapistType === 'mobile' ? address : prev.location,
      latitude: prev.therapistType === 'mobile' ? lat : prev.latitude,
      longitude: prev.therapistType === 'mobile' ? lon : prev.longitude,
    }));

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.baseAddress;
      if (prev.therapistType === 'mobile') {
        delete next.location;
      }
      return next;
    });
  }, []);

  const getFieldErrorClass = useCallback((fieldName: string) => {
    return validationErrors[fieldName] 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : '';
  }, [validationErrors]);
  
  const totalSteps = useMemo(() => {
    let steps = (effectiveRole === 'client' || effectiveRole === null) ? 2 : 6;
    if (effectiveRole !== 'client' && effectiveRole !== null && formData.therapistType === 'clinic_based') {
      steps = 5;
    }
    return steps;
  }, [effectiveRole, formData.therapistType]);

  // Calculate displayed step number accounting for skipped steps
  // For clinic_based: Steps are 0,1,2,4,5 (skips 3=Radius) → Display as 1,2,3,4,5
  // For mobile/hybrid: Steps are 0,1,2,3,4,5 → Display as 1,2,3,4,5,6
  const getDisplayStepNumber = useCallback((currentStep: number): number => {
    if (effectiveRole === 'client' || effectiveRole === null) {
      return currentStep + 1;
    }
    
    // For clinic_based therapists, Radius step (3) is skipped
    if (formData.therapistType === 'clinic_based') {
      // Map: 0→1, 1→2, 2→3, 4→4, 5→5
      if (currentStep <= PRACTITIONER_STEPS.LOCATION) {
        // Steps 0, 1, 2 → Display as 1, 2, 3
        return currentStep + 1;
      } else if (currentStep === PRACTITIONER_STEPS.STRIPE_CONNECT) {
        // Step 4 (Stripe) → Display as 4 (not 5, because we skipped step 3)
        return 4;
      } else if (currentStep === PRACTITIONER_STEPS.SUBSCRIPTION) {
        // Step 5 (Subscription) → Display as 5
        return 5;
      }
    }
    
    // For mobile/hybrid, all steps are shown (no skipping)
    return currentStep + 1;
  }, [effectiveRole, formData.therapistType]);

  const displayStepNumber = useMemo(() => getDisplayStepNumber(step), [step, getDisplayStepNumber]);
  const progressPercent = useMemo(() => (displayStepNumber / totalSteps) * 100, [displayStepNumber, totalSteps]);
  const stepTransition = prefersReducedMotion ? { duration: 0 } : onboardingSpring;

  const handleNext = async () => {
    if (stepProcessing) return;
    setStepProcessing(true);
    try {
    setShowValidationErrors(true);
    
    const currentStepErrors: Record<string, string> = {};
    
    if (effectiveRole === 'client' || effectiveRole === null) {
      // Client validation (client steps are 0 and 1; no location required)
      if (step === 0) {
        if (!formData.phone?.trim()) currentStepErrors.phone = 'Phone number is required';
      } else if (step === 1) {
        if (!formData.firstName?.trim()) currentStepErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) currentStepErrors.lastName = 'Last name is required';
      }
    } else {
      // Practitioner validation
      if (step === PRACTITIONER_STEPS.THERAPIST_TYPE) {
        if (!formData.therapistType) {
          currentStepErrors.therapistType = 'Please select your therapist type';
        }
      } else if (step === PRACTITIONER_STEPS.BASIC_INFO) {
        if (!formData.firstName?.trim()) currentStepErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) currentStepErrors.lastName = 'Last name is required';
        if (!formData.phone?.trim()) currentStepErrors.phone = 'Phone number is required';
      } else if (step === PRACTITIONER_STEPS.LOCATION) {
        // Debug logging
        console.log('📍 Location step validation:', {
          therapistType: formData.therapistType,
          clinicAddress: formData.clinicAddress,
          baseAddress: formData.baseAddress,
          formData: formData
        });
        
        if (formData.therapistType === 'clinic_based') {
          const clinicAddr = formData.clinicAddress?.trim();
          if (!clinicAddr || clinicAddr.length === 0) {
            currentStepErrors.clinicAddress = 'Clinic address is required';
          }
        } else if (formData.therapistType === 'mobile') {
          const baseAddr = formData.baseAddress?.trim();
          if (!baseAddr || baseAddr.length === 0) {
            currentStepErrors.baseAddress = 'Base address is required';
          } else {
            const detailedAddressValidation = validateDetailedStreetAddress(baseAddr);
            if (!detailedAddressValidation.isValid) {
              currentStepErrors.baseAddress = detailedAddressValidation.message || 'Please enter a full base address';
            }
          }
        } else if (formData.therapistType === 'hybrid') {
          const clinicAddr = formData.clinicAddress?.trim();
          const baseAddr = formData.baseAddress?.trim();
          if (!clinicAddr || clinicAddr.length === 0) {
            currentStepErrors.clinicAddress = 'Clinic address is required';
          }
          if (!baseAddr || baseAddr.length === 0) {
            currentStepErrors.baseAddress = 'Base address is required';
          } else {
            const detailedAddressValidation = validateDetailedStreetAddress(baseAddr);
            if (!detailedAddressValidation.isValid) {
              currentStepErrors.baseAddress = detailedAddressValidation.message || 'Please enter a full base address';
            }
          }
        } else {
          // Fallback: if therapistType is not set, check location field
          if (!formData.location?.trim() && !formData.clinicAddress?.trim() && !formData.baseAddress?.trim()) {
            currentStepErrors.location = 'Location is required';
          }
        }
      }
      // Step 3 (Radius) - no validation needed, has default
      // Step 4 (Stripe) and Step 5 (Subscription) don't have form fields to validate here
    }
    
    setValidationErrors(currentStepErrors);
    
    if (Object.keys(currentStepErrors).length > 0) {
      toast.error('Please fix the errors below before continuing');
      setStepProcessing(false); // Reset processing state so user can try again
      return;
    }
    
    // Verify Stripe Connect (Step 4)
    if (effectiveRole !== 'client' && step === PRACTITIONER_STEPS.STRIPE_CONNECT) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('stripe_connect_account_id')
          .eq('id', resolvedProfile?.id)
          .single();
        
        if (userError) {
          console.error('Error checking Stripe Connect status:', userError);
          toast.error('Failed to verify payment setup. Please try again.');
          setStepProcessing(false);
          return;
        }
        
        if (!userData?.stripe_connect_account_id) {
          toast.error('Please complete Stripe Connect setup before continuing');
          setStepProcessing(false);
          return;
        }
        
        if (!resolvedProfile?.stripe_connect_account_id && userData.stripe_connect_account_id) {
          await refreshProfile();
        }
      } catch (error) {
        console.error('Error verifying Stripe Connect:', error);
        toast.error('Failed to verify payment setup');
        setStepProcessing(false);
        return;
      }
    }
    
    // Verify Subscription (Step 5) - Final Step
    if (effectiveRole !== 'client' && step === PRACTITIONER_STEPS.SUBSCRIPTION) {
      if (!subscribed) {
        toast.error('Subscription required to complete onboarding', {
          description: 'Please complete your subscription first'
        });
        return;
      }
      // If subscribed, proceed to completion
      handleComplete();
      return;
    }
    
    // Skip radius step for clinic-based therapists
    if (effectiveRole !== 'client' && effectiveRole !== null && step === PRACTITIONER_STEPS.LOCATION) {
      const nextStep = (formData.therapistType === 'mobile' || formData.therapistType === 'hybrid') 
        ? PRACTITIONER_STEPS.RADIUS 
        : PRACTITIONER_STEPS.STRIPE_CONNECT;
      
      // Validate that form data supports the step being saved
      const validatedStep = getActualStepFromFormData(formData, nextStep);
      if (validatedStep !== nextStep) {
        console.warn(`⚠️ Cannot save step ${nextStep}, form data only supports step ${validatedStep}`);
        toast.error('Please complete all required fields before continuing');
        setStepProcessing(false);
        return;
      }
      
      setStep(nextStep);
      setShowValidationErrors(false);
      
      // Auto-save progress with validated step
      const completedSteps = Array.from({ length: step + 1 }, (_, i) => i);
      saveProgress(validatedStep, formData, completedSteps).then((success) => {
        if (success) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        }
      });
      return;
    }
    
    // Client has 2 steps (0 and 1). On step 1 (last step), complete onboarding instead of advancing
    if ((effectiveRole === 'client' || effectiveRole === null) && step === 1) {
      handleComplete();
      setStepProcessing(false);
      return;
    }

    if (step < totalSteps) {
      const stepToSave = step + 1;
      
      // Validate that form data supports the step being saved
      if (effectiveRole !== 'client' && effectiveRole !== null) {
        const validatedStep = getActualStepFromFormData(formData, stepToSave);
        if (validatedStep !== stepToSave) {
          console.warn(`⚠️ Cannot save step ${stepToSave}, form data only supports step ${validatedStep}`);
          toast.error('Please complete all required fields before continuing');
          setStepProcessing(false);
          return;
        }
        
        setStep(stepToSave);
        setShowValidationErrors(false);
        
        // Auto-save progress with validated step
        const completedSteps = Array.from({ length: step + 1 }, (_, i) => i);
        saveProgress(validatedStep, formData, completedSteps).then((success) => {
          if (success) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
          }
        });
      } else {
        setStep(stepToSave);
        setShowValidationErrors(false);
      }
    } else {
      handleComplete();
    }
    } finally {
      setStepProcessing(false);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      // Skip radius step when going back for clinic-based therapists
      if (effectiveRole !== 'client' && effectiveRole !== null && step === PRACTITIONER_STEPS.STRIPE_CONNECT) {
        const prevStep = (formData.therapistType === 'mobile' || formData.therapistType === 'hybrid')
          ? PRACTITIONER_STEPS.RADIUS
          : PRACTITIONER_STEPS.LOCATION;
        setStep(prevStep);
      } else {
        setStep(step - 1);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleSubscriptionSelected = async (planId: string) => {
    toast.success('Redirecting to payment...');
  };

  const handleVerifySubscription = async () => {
    setSubscriptionVerifying(true);
    try {
      await checkSubscription();
      if (subscribed) {
        toast.success('Subscription verified! You can now continue.');
      } else {
        toast.error('Subscription not found. Please complete payment or try again.');
      }
    } catch (error) {
      toast.error('Failed to verify subscription. Please try again.');
    } finally {
      setSubscriptionVerifying(false);
    }
  };

  // Check subscription status
  useEffect(() => {
    if (effectiveRole !== 'client' && step === PRACTITIONER_STEPS.SUBSCRIPTION) {
      checkSubscription();
    }
  }, [step, effectiveRole, checkSubscription]);

  // Preload heavy payment onboarding chunks before users reach Stripe step.
  useEffect(() => {
    if (effectiveRole === 'client' || effectiveRole === null) return;
    if (step >= PRACTITIONER_STEPS.RADIUS - 1) {
      void import('@/components/onboarding/PaymentSetupStep');
      void import('@/components/onboarding/EmbeddedStripeOnboarding');
    }
  }, [effectiveRole, step]);

  // Check subscription status return from payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    const paymentSuccess = urlParams.get('payment_success');
    
    if (effectiveRole !== 'client' && step === PRACTITIONER_STEPS.SUBSCRIPTION && (sessionId || success || paymentSuccess)) {
      setSubscriptionCompleted(true);
      setSubscriptionVerifying(true);
      
      checkSubscription().then(() => {
        if (subscribed) {
          toast.success('Subscription active!');
          navigate(window.location.pathname, { replace: true });
        } else {
          toast.warning('Subscription verification in progress.');
        }
      }).finally(() => {
        setSubscriptionVerifying(false);
      });
    }
  }, [effectiveRole, step, checkSubscription, subscribed, navigate]);

  // Pre-populate
  useEffect(() => {
    if (resolvedProfile?.first_name || resolvedProfile?.last_name) {
      setFormData(prev => ({
        ...prev,
        firstName: resolvedProfile.first_name || prev.firstName,
        lastName: resolvedProfile.last_name || prev.lastName
      }));
    }
  }, [resolvedProfile, effectiveRole]);

  // Redirect to role-selection only when we have a profile but no role from any source
  useEffect(() => {
    if (authLoading) return;
    if (userProfile && !userProfile.user_role && !roleFromUrl && !(isRecentRoleSelection && localStorageRole)) {
      navigate('/auth/role-selection', { replace: true });
    }
  }, [userProfile, authLoading, navigate, roleFromUrl, isRecentRoleSelection, localStorageRole]);

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Validate onboarding data - Minimal check
      let validation;
      if (effectiveRole === 'client' || effectiveRole === null) {
        const clientData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        };
        validation = validateOnboardingData('client', clientData);
      } else {
        // Practitioner - Minimal Data
        const practitionerData = {
          phone: formData.phone,
          location: formData.location,
        };
        validation = validateOnboardingData((effectiveRole || 'client') as UserRole, practitionerData);
      }
      
      if (!validation.isValid) {
        toast.error(validation.errors.join(', '));
        return;
      }

      let error;
      
      if (effectiveRole === 'client' || effectiveRole === null) {
        const clientData = {
          firstName: formData.firstName || resolvedProfile?.first_name || '',
          lastName: formData.lastName || resolvedProfile?.last_name || '',
          phone: formData.phone,
          location: formData.location,
        };
        const result = await completeClientOnboarding(resolvedProfile?.id || '', clientData);
        error = result.error;
      } else {
        let enriched = { ...formData } as any;
        if (!enriched.firstName || !enriched.lastName) {
          enriched.firstName = enriched.firstName || resolvedProfile?.first_name || '';
          enriched.lastName = enriched.lastName || resolvedProfile?.last_name || '';
        }
        
        // Strict mode: therapist type must be explicitly selected (no inference/fallbacks)
        if (!formData.therapistType) {
          throw new Error('Please select your practitioner type to complete onboarding.');
        }
        const practitionerData = {
          phone: formData.phone,
          location: formData.location,
          firstName: enriched.firstName,
          lastName: enriched.lastName,
          has_liability_insurance: formData.hasLiabilityInsurance,
          therapist_type: formData.therapistType,
          clinic_address: formData.clinicAddress || null,
          clinic_latitude: formData.clinicLatitude || null,
          clinic_longitude: formData.clinicLongitude || null,
          base_address: formData.baseAddress || null,
          base_latitude: formData.baseLatitude || null,
          base_longitude: formData.baseLongitude || null,
          mobile_service_radius_km:
            formData.therapistType === 'mobile' || formData.therapistType === 'hybrid'
              ? (formData.mobileServiceRadiusKm || null)
              : null,
          address_line1: formData.addressLine1 || undefined,
          address_line2: formData.addressLine2 || undefined,
          address_city: formData.addressCity || undefined,
          address_county: formData.addressCounty || undefined,
          address_postcode: formData.addressPostcode || undefined,
          address_country: formData.addressCountry || undefined,
        };

        const result = await completePractitionerOnboarding(
          resolvedProfile?.id || '',
          (effectiveRole || 'client') as UserRole,
          practitionerData
        );
        error = result.error;
      }

      if (error) throw error;

      if (effectiveRole !== 'client' && effectiveRole !== null) {
        await clearProgress();
      }

      toast.success('Account setup completed!');
      await refreshProfile();
      
      const userRole = effectiveRole || 'client';
      let dashboardRoute = '/client/dashboard';
      if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userRole)) {
        dashboardRoute = '/dashboard';
      } else if (userRole === 'admin') {
        dashboardRoute = '/admin/verification';
      }
      
      navigate(dashboardRoute);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeLabel = () => {
    switch (effectiveRole) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      case 'client': return 'Client';
      default: return 'User';
    }
  };

  // Unauthenticated: send to sign-in instead of infinite spinner
  if (!authLoading && !user) {
    navigate('/auth/sign-in', { replace: true, state: { from: location.pathname + location.search } });
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Loading: initial auth or profile still loading (only block when we have no role from URL to fall back to)
  const canProceedWithUrlRole = !!(user && roleFromUrl);
  if (authLoading || (!resolvedProfile && !canProceedWithUrlRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
      </div>
    );
  }

  // Have session but profile not loaded yet and no URL role: brief wait then show spinner (profileLoading not set on initial load, so we rely on resolvedProfile from fallback)
  if (!resolvedProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
      </div>
    );
  }

  // Redirect to role-selection only when we have no role from profile, URL, or recent localStorage
  if (!resolvedProfile.user_role && !roleFromUrl && !(isRecentRoleSelection && localStorageRole)) {
    navigate('/auth/role-selection', { replace: true });
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
      <Button variant="ghost" size="sm" onClick={handleSignOut} className="absolute top-4 right-4 flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
      
      <motion.div
        className="w-full max-w-2xl"
        variants={onboardingFadeVariants}
        initial="initial"
        animate="animate"
        transition={stepTransition}
      >
      <Card className="w-full max-w-2xl transition-[border-color,background-color] duration-200 ease-out">
        <CardHeader className="text-center p-4 sm:p-6 relative">
          <div className="flex items-center justify-center mb-4">
            <span className="text-xl sm:text-2xl font-bold">TheraMate.</span>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Welcome, {resolvedProfile?.first_name || 'User'}!</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Let's set up your {getUserTypeLabel()} profile - Step {displayStepNumber} of {totalSteps}
          </CardDescription>
          <Progress value={progressPercent} className="mt-4" />
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {showValidationErrors && <ValidationErrorDisplay errors={validationErrors} />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${effectiveRole || 'unknown'}-${step}-${formData.therapistType || 'unset'}`}
              className="onboarding-step-layer"
              variants={prefersReducedMotion ? onboardingFadeVariants : onboardingStepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={stepTransition}
            >
          {/* Step 0: Therapist Type Selection (Practitioners only) */}
          {step === PRACTITIONER_STEPS.THERAPIST_TYPE && effectiveRole !== 'client' && effectiveRole !== null && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Choose Your Practice Type</h2>
                <p className="text-muted-foreground">Select how you'll be providing services to clients</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => handleFieldChange('therapistType', 'clinic_based')}
                  className={`p-6 rounded-lg border-2 transition-[border-color,background-color] duration-200 ease-out ${
                    formData.therapistType === 'clinic_based'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Building2 className={`h-12 w-12 mx-auto mb-4 ${
                    formData.therapistType === 'clinic_based' ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <h3 className="font-semibold text-lg mb-2">Clinic Based Therapist</h3>
                  <p className="text-sm text-muted-foreground">
                    You provide services at a fixed clinic location
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleFieldChange('therapistType', 'mobile')}
                  className={`p-6 rounded-lg border-2 transition-[border-color,background-color] duration-200 ease-out ${
                    formData.therapistType === 'mobile'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Car className={`h-12 w-12 mx-auto mb-4 ${
                    formData.therapistType === 'mobile' ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <h3 className="font-semibold text-lg mb-2">Mobile Therapist</h3>
                  <p className="text-sm text-muted-foreground">
                    You travel to clients' locations to provide services
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleFieldChange('therapistType', 'hybrid')}
                  className={`p-6 rounded-lg border-2 transition-[border-color,background-color] duration-200 ease-out ${
                    formData.therapistType === 'hybrid'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Building className={`h-12 w-12 mx-auto mb-4 ${
                    formData.therapistType === 'hybrid' ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <h3 className="font-semibold text-lg mb-2">Hybrid Therapist</h3>
                  <p className="text-sm text-muted-foreground">
                    You offer both clinic-based and mobile services
                  </p>
                </button>
              </div>
              
              {validationErrors.therapistType && (
                <p className="text-sm text-red-600 text-center">{validationErrors.therapistType}</p>
              )}
            </div>
          )}

          {/* Step 0: Client – Basic Info (phone only) */}
          {step === 0 && (effectiveRole === 'client' || effectiveRole === null) && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <UserIcon className="h-5 w-5" />
                <span className="font-medium">Basic Information</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <SmartPhonePicker id="phone" value={formData.phone} onChange={(value) => handleFieldChange('phone', value)} placeholder="Enter your phone number" error={validationErrors.phone} />
              </div>
            </div>
          )}

          {/* Step 1: Practitioner Basic Info */}
          {step === PRACTITIONER_STEPS.BASIC_INFO && effectiveRole !== 'client' && effectiveRole !== null && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <UserIcon className="h-5 w-5" />
                <span className="font-medium">Basic Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={(e) => handleFieldChange('firstName', e.target.value)} className={getFieldErrorClass('firstName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={(e) => handleFieldChange('lastName', e.target.value)} className={getFieldErrorClass('lastName')} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <SmartPhonePicker id="phone" value={formData.phone} onChange={(value) => handleFieldChange('phone', value)} placeholder="Enter your phone number" error={validationErrors.phone} />
              </div>
              
              {effectiveRole !== 'client' && effectiveRole !== null && (
                <div className="space-y-2">
                  <Label className="text-sm font-normal">
                    <Checkbox
                      checked={formData.hasLiabilityInsurance}
                      onCheckedChange={(checked) => handleFieldChange('hasLiabilityInsurance', checked)}
                      className="mr-2"
                    />
                    Do you have liability insurance for ALL of the services you offer?
                  </Label>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Location (Practitioners only) */}
          {step === PRACTITIONER_STEPS.LOCATION && effectiveRole !== 'client' && effectiveRole !== null && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Location Setup</span>
              </div>
              
              {formData.therapistType === 'clinic_based' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clinicAddress" className="text-base font-semibold">Clinic Address *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      This address will be shown on the marketplace to help clients find you
                    </p>
                    <SmartLocationPicker
                      id="clinicAddress"
                      value={formData.clinicAddress || ''}
                      onChange={handleClinicAddressChange}
                      onLocationSelect={handleClinicLocationSelect}
                      placeholder="Enter your clinic address (e.g., 123 Main St, London, UK)"
                      error={validationErrors.clinicAddress}
                    />
                  </div>
                </div>
              )}
              
              {formData.therapistType === 'mobile' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="baseAddress" className="text-base font-semibold">Base Address *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      This can be your home address or workspace. It will NOT be shown on the marketplace, but will be used to calculate your service radius.
                    </p>
                    <SmartLocationPicker
                      id="baseAddress"
                      value={formData.baseAddress || ''}
                      onChange={handleBaseAddressChange}
                      onLocationSelect={handleBaseLocationSelect}
                      placeholder="Enter your base address (e.g., 123 Main St, London, UK)"
                      error={validationErrors.baseAddress}
                    />
                  </div>
                </div>
              )}
              
              {formData.therapistType === 'hybrid' && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="clinicAddress" className="text-base font-semibold">Clinic Address *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      This address will be shown on the marketplace
                    </p>
                    <SmartLocationPicker
                      id="clinicAddress"
                      value={formData.clinicAddress || ''}
                      onChange={handleClinicAddressChange}
                      onLocationSelect={handleClinicLocationSelect}
                      placeholder="Enter your clinic address (e.g., 123 Main St, London, UK)"
                      error={validationErrors.clinicAddress}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="baseAddress" className="text-base font-semibold">Base Address *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your home or workspace address for mobile services. This will NOT be shown on the marketplace.
                    </p>
                    <SmartLocationPicker
                      id="baseAddress"
                      value={formData.baseAddress || ''}
                      onChange={handleBaseAddressChange}
                      onLocationSelect={handleBaseLocationSelect}
                      placeholder="Enter your base address (e.g., 123 Main St, London, UK)"
                      error={validationErrors.baseAddress}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Radius Selection (Mobile and Hybrid only) */}
          {step === PRACTITIONER_STEPS.RADIUS && effectiveRole !== 'client' && effectiveRole !== null && (formData.therapistType === 'mobile' || formData.therapistType === 'hybrid') && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Service Radius</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-2 block">
                    How far are you willing to travel? ({formData.mobileServiceRadiusKm} km)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clients within this radius will be able to see and book your mobile services
                  </p>
                  <Slider
                    value={[formData.mobileServiceRadiusKm]}
                    onValueChange={(value) => handleFieldChange('mobileServiceRadiusKm', value[0])}
                    min={5}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>5 km</span>
                    <span>100 km</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Client Step 2 of 2 – Personal Information */}
          {step === 1 && (effectiveRole === 'client' || effectiveRole === null) && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Personal Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-green-900">Account setup complete!</p>
                    <p className="text-sm text-green-800">As a client you can now:</p>
                    <ul className="text-sm text-green-800 space-y-1 list-disc list-inside ml-2">
                      <li>Start finding a booking session full of our therapist in the area</li>
                      <li>Track your progress</li>
                      <li>Ask the search for therapists</li>
                      <li>Browse on the marketplace</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Practitioner Step 2: Stripe Connect */}
          {step === PRACTITIONER_STEPS.STRIPE_CONNECT && effectiveRole !== 'client' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Connect Your Payment Account</h2>
                <p className="text-muted-foreground">Set up your Stripe Connect account to receive payments from clients</p>
              </div>
              <Suspense
                fallback={(
                  <div className="min-h-[320px] rounded-lg border border-border/60 bg-muted/20 animate-pulse" />
                )}
              >
                <PaymentSetupStep onComplete={handleNext} />
              </Suspense>
              <div className="flex space-x-2 pt-4">
                <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
              </div>
            </div>
          )}

          {/* Practitioner Step 3: Subscription */}
          {step === PRACTITIONER_STEPS.SUBSCRIPTION && effectiveRole !== 'client' && (
            <div className="space-y-6">
              {subscribed ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center"><div className="p-4 rounded-full bg-green-100"><CheckCircle className="h-8 w-8 text-green-600" /></div></div>
                  <div><h3 className="text-xl font-semibold text-green-800">Subscription Active!</h3><p className="text-green-600">Your {subscriptionTier} plan is now active.</p></div>
                  <Button onClick={handleComplete} className="w-full">Complete Setup</Button>
                </div>
              ) : subscriptionCompleted && subscriptionVerifying ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                  <div><h3 className="text-xl font-semibold text-blue-800">Verifying Subscription...</h3></div>
                </div>
              ) : (
                <SubscriptionSelection onSubscriptionSelected={handleSubscriptionSelected} onBack={handleBack} loading={loading} />
              )}
            </div>
          )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation - General */}
          {((effectiveRole === 'client' || effectiveRole === null) || (effectiveRole !== 'client' && step < 5 && step !== PRACTITIONER_STEPS.STRIPE_CONNECT)) && (
            <div className="space-y-3 pt-4">
              <div className="flex space-x-2">
                {step > 0 && <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>}
                <Button onClick={handleNext} className="flex-1" disabled={loading || stepProcessing}>
                  {(loading || stepProcessing) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {stepProcessing ? 'Verifying...' : 'Processing...'}
                    </>
                  ) : ((effectiveRole === 'client' || effectiveRole === null) ? step === 1 : step === totalSteps) ? 'Complete Setup' : 'Continue'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
};

export default Onboarding;
