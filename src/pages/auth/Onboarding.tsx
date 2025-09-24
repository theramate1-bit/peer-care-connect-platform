import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Heart, User, MapPin, Award, CheckCircle, Shield, LogOut, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getDashboardRoute } from '@/lib/dashboard-routing';
import { completePractitionerOnboarding, completeClientOnboarding, validateOnboardingData } from '@/lib/onboarding-utils';
import { SubscriptionSelection } from '@/components/onboarding/SubscriptionSelection';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { generateAvatarUrl, DEFAULT_AVATAR_PREFERENCES, AVATAR_OPTIONS, AVATAR_STYLES, type AvatarPreferences } from '@/lib/avatar-generator';
import { UserRole } from '@/types/roles';
import AvailabilitySetup from '@/components/onboarding/AvailabilitySetup';
import { LocationSetup } from '@/components/onboarding/LocationSetup';
import { Analytics } from '@/lib/analytics';
import { useRealtime } from '@/contexts/RealtimeContext';

const Onboarding = () => {
  const { userProfile, updateProfile, signOut, loading: authLoading } = useAuth();
  const { subscribed, subscriptionTier, checkSubscription } = useSubscription();
  const realtime = useRealtime();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [subscriptionCompleted, setSubscriptionCompleted] = useState(false);
  const [subscriptionVerifying, setSubscriptionVerifying] = useState(false);
  const [showAvatarCustomization, setShowAvatarCustomization] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    bio: '',
    experience_years: '',
    specializations: [] as string[],
    qualifications: [] as string[],
    hourly_rate: '',
    availability: {},
    timezone: 'Europe/London',
    professional_body: '',
    professional_body_other: '',
    registration_number: '',
    qualification_type: '',
    qualification_file: null as File | null,
    qualification_expiry: '',
    user_role: userProfile?.user_role || '',
    // New marketplace fields
    professional_statement: '',
    treatment_philosophy: '',
    response_time_hours: '',
    // Client-specific fields
    firstName: '',
    lastName: '',
    primaryGoal: '',
    preferredTherapyTypes: [] as string[],
    // Avatar customization
    avatarPreferences: DEFAULT_AVATAR_PREFERENCES as AvatarPreferences,
    customizeAvatar: false,
    // Location data
    latitude: null as number | null,
    longitude: null as number | null,
    service_radius_km: 25,
    services_offered: [] as string[]
  });

  // Check localStorage for role fallback
  const localStorageRole = localStorage.getItem('selectedRole');
  const roleSelectionTime = localStorage.getItem('roleSelectionTimestamp');
  const isRecentRoleSelection = roleSelectionTime && (Date.now() - parseInt(roleSelectionTime)) < 300000; // 5 minutes
  
  // Use localStorage role if database role is missing and selection was recent
  const effectiveRole = userProfile?.user_role || (isRecentRoleSelection ? localStorageRole : null);

  // Field validation function
  const validateField = (fieldName: string, value: any) => {
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
      case 'bio':
        if (!value?.trim()) errors.bio = 'Bio is required';
        else if (value.trim().length < 50) {
          errors.bio = 'Bio must be at least 50 characters long';
        }
        break;
      case 'experience_years':
        if (!value?.trim()) errors.experience_years = 'Years of experience is required';
        else if (isNaN(Number(value)) || Number(value) < 0) {
          errors.experience_years = 'Please enter a valid number of years';
        }
        break;
      case 'hourly_rate':
        if (!value?.trim()) errors.hourly_rate = 'Hourly rate is required';
        else if (isNaN(Number(value)) || Number(value) < 0) {
          errors.hourly_rate = 'Please enter a valid hourly rate';
        }
        break;
      case 'professional_body':
        if (!value?.trim()) errors.professional_body = 'Professional body is required';
        break;
      case 'registration_number':
        if (!value?.trim()) errors.registration_number = 'Registration number is required';
        break;
      case 'primaryGoal':
        if (!value?.trim()) errors.primaryGoal = 'Primary goal is required';
        break;
      case 'preferredTherapyTypes':
        if (!value || value.length === 0) errors.preferredTherapyTypes = 'Please select at least one therapy type';
        break;
      case 'specializations':
        if (!value || value.length === 0) errors.specializations = 'Please select at least one specialization';
        break;
      case 'qualifications':
        if (!value || value.length === 0) errors.qualifications = 'Please add at least one qualification';
        break;
    }
    
    return errors;
  };

  // Handle field changes with real-time validation
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear previous error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    // Validate field in real-time
    const fieldErrors = validateField(fieldName, value);
    if (Object.keys(fieldErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...fieldErrors }));
    }
  };

  // Get field error class for styling
  const getFieldErrorClass = (fieldName: string) => {
    return validationErrors[fieldName] 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : '';
  };
  
  const totalSteps = (effectiveRole === 'client' || effectiveRole === null) ? (showAvatarCustomization ? 3 : 2) : 6; // Enhanced professional flow: 6 steps (added availability and location steps)
  const progress = (step / totalSteps) * 100;
  
  // Debug logging
  console.log('🔍 Onboarding Debug:', {
    userProfile: userProfile ? {
      id: userProfile.id,
      email: userProfile.email,
      user_role: userProfile.user_role,
      onboarding_status: userProfile.onboarding_status,
      profile_completed: userProfile.profile_completed
    } : null,
    localStorageRole,
    effectiveRole,
    authLoading,
    step,
    totalSteps,
    isClient: effectiveRole === 'client',
    isPractitioner: effectiveRole !== 'client' && effectiveRole !== null
  });

  const handleNext = () => {
    setShowValidationErrors(true);
    
    // Validate current step fields
    const currentStepErrors: Record<string, string> = {};
    
    if (effectiveRole === 'client' || effectiveRole === null) {
      // Client validation
      if (step === 1) {
        if (!formData.phone?.trim()) currentStepErrors.phone = 'Phone number is required';
        if (!formData.location?.trim()) currentStepErrors.location = 'Location is required';
      } else if (step === 2) {
        if (!formData.firstName?.trim()) currentStepErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) currentStepErrors.lastName = 'Last name is required';
        if (!formData.primaryGoal?.trim()) currentStepErrors.primaryGoal = 'Primary goal is required';
        if (!formData.preferredTherapyTypes || formData.preferredTherapyTypes.length === 0) {
          currentStepErrors.preferredTherapyTypes = 'Please select at least one therapy type';
        }
      }
    } else {
      // Practitioner validation
      if (step === 1) {
        if (!formData.phone?.trim()) currentStepErrors.phone = 'Phone number is required';
        if (!formData.location?.trim()) currentStepErrors.location = 'Location is required';
        if (!formData.bio?.trim()) currentStepErrors.bio = 'Bio is required';
      } else if (step === 2) {
        if (!formData.experience_years?.trim()) currentStepErrors.experience_years = 'Years of experience is required';
        if (!formData.professional_body?.trim()) currentStepErrors.professional_body = 'Professional body is required';
        if (!formData.registration_number?.trim()) currentStepErrors.registration_number = 'Registration number is required';
      } else if (step === 5) {
        if (!formData.hourly_rate?.trim()) currentStepErrors.hourly_rate = 'Hourly rate is required';
        if (!formData.specializations || formData.specializations.length === 0) {
          currentStepErrors.specializations = 'Please select at least one specialization';
        }
      }
    }
    
    // Set validation errors
    setValidationErrors(currentStepErrors);
    
    // If there are errors, don't proceed
    if (Object.keys(currentStepErrors).length > 0) {
      toast.error('Please fix the errors below before continuing');
      return;
    }
    
    // For practitioners, check subscription before allowing progression from step 4 to 5
    if (effectiveRole !== 'client' && step === 4) {
      if (!subscribed) {
        toast.error('Please complete your subscription to continue');
        return;
      }
    }
    
    // For practitioners, check subscription before allowing progression from step 5 to 6
    if (effectiveRole !== 'client' && step === 5) {
      if (!subscribed) {
        toast.error('Please complete your subscription to continue');
        return;
      }
    }
    
    // For practitioners, check subscription before allowing completion (step 6)
    if (effectiveRole !== 'client' && step === 6) {
      if (!subscribed) {
        toast.error('Please complete your subscription to continue');
        return;
      }
    }
    
    if (step < totalSteps) {
      setStep(step + 1);
      setShowValidationErrors(false); // Clear validation errors when moving to next step
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
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
    setSubscriptionCompleted(true);
    setSubscriptionVerifying(true);
    toast.success('Subscription initiated! Please complete payment to continue.');
    
    // Check subscription status after a short delay
    setTimeout(async () => {
      await checkSubscription();
      setSubscriptionVerifying(false);
    }, 2000);
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

  // Check subscription status when component mounts or when returning from payment
  useEffect(() => {
    if (effectiveRole !== 'client' && step === 3) {
      checkSubscription();
    }
  }, [step, effectiveRole, checkSubscription]);

  // Check subscription status when user returns from payment (URL params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    
    if (effectiveRole !== 'client' && step === 3 && (sessionId || success)) {
      // User returned from Stripe checkout
      setSubscriptionVerifying(true);
      checkSubscription().finally(() => {
        setSubscriptionVerifying(false);
      });
    }
  }, [effectiveRole, step, checkSubscription]);

  // Initialize form data with user profile values for clients
  useEffect(() => {
    if ((effectiveRole === 'client' || effectiveRole === null) && userProfile?.first_name && userProfile?.last_name) {
      setFormData(prev => ({
        ...prev,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name
      }));
    }
  }, [userProfile]);


  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Validate onboarding data
      let validation;
      if (effectiveRole === 'client' || effectiveRole === null) {
        const clientData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          primaryGoal: formData.primaryGoal,
          preferredTherapyTypes: formData.preferredTherapyTypes,
        };
        validation = validateOnboardingData('client', clientData);
      } else {
        // For practitioners, create practitioner-specific data object
        const practitionerData = {
          phone: formData.phone,
          bio: formData.bio,
          location: formData.location,
          experience_years: formData.experience_years,
          specializations: formData.specializations,
          qualifications: formData.qualifications,
          hourly_rate: formData.hourly_rate,
          professional_body: formData.professional_body,
          professional_body_other: formData.professional_body_other,
          registration_number: formData.registration_number,
          qualification_type: formData.qualification_type,
          qualification_file: formData.qualification_file,
          qualification_expiry: formData.qualification_expiry,
          professional_statement: formData.professional_statement,
          treatment_philosophy: formData.treatment_philosophy,
          response_time_hours: formData.response_time_hours,
        };
        validation = validateOnboardingData((effectiveRole || 'client') as UserRole, practitionerData);
      }
      
      if (!validation.isValid) {
        toast.error(validation.errors.join(', '));
        return;
      }

      let error;
      
      // Complete onboarding using the appropriate function based on user role
      if (effectiveRole === 'client' || effectiveRole === null) {
        // For clients, use the form data which now includes firstName and lastName
        const clientData = {
          firstName: formData.firstName || userProfile?.first_name || '',
          lastName: formData.lastName || userProfile?.last_name || '',
          phone: formData.phone,
          location: formData.location,
          primaryGoal: formData.primaryGoal,
          preferredTherapyTypes: formData.preferredTherapyTypes,
          avatarPreferences: formData.customizeAvatar ? formData.avatarPreferences : null,
        };
        
        const result = await completeClientOnboarding(userProfile?.id || '', clientData);
        error = result.error;
      } else {
        // For practitioners, use the existing function
        const result = await completePractitionerOnboarding(
          userProfile?.id || '',
          (effectiveRole || 'client') as UserRole,
          formData
        );
        error = result.error;
      }

      if (error) throw error;

      toast.success('Profile setup completed successfully!');
      
      // Refresh the user profile to get the updated onboarding status
      await updateProfile({});
      
      // Navigate to appropriate dashboard based on user role
      const userRole = effectiveRole || 'client';
      let dashboardRoute = '/client/dashboard';
      
      if (userRole === 'client') {
        dashboardRoute = '/client/dashboard';
      } else if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userRole)) {
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

  // Validation Error Display Component
  const ValidationErrorDisplay = ({ errors }: { errors: Record<string, string> }) => {
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
  };

  const getProfessionalBodies = () => {
    // Use formData.user_role if available, otherwise fall back to userProfile
    const userRole = formData.user_role || effectiveRole;
    
    switch (userRole) {
      case 'sports_therapist':
        return [
          { value: 'british_association_of_sports_therapists', label: 'British Association of Sports Rehabilitators and Therapists (BASRaT)' },
          { value: 'society_of_sports_therapists', label: 'Society of Sports Therapists (SST)' },
          { value: 'professional_liability_insurance', label: 'Professional Liability Insurance' },
          { value: 'public_liability_insurance', label: 'Public Liability Insurance' },
          { value: 'other', label: 'Other - specify' },
        ];
      case 'massage_therapist':
        return [
          { value: 'society_of_sports_therapists', label: 'Society of Sports Therapists' },
          { value: 'other', label: 'Other' },
        ];
      case 'osteopath':
        return [
          { value: 'british_osteopathic_association', label: 'British Osteopathic Association' },
          { value: 'chartered_society_of_physiotherapy', label: 'Chartered Society of Physiotherapy' },
          { value: 'other', label: 'Other' },
        ];
      default:
        return [
          { value: 'british_association_of_sports_therapists', label: 'British Association of Sports Rehabilitators and Therapists (BASRaT)' },
          { value: 'society_of_sports_therapists', label: 'Society of Sports Therapists (SST)' },
          { value: 'british_osteopathic_association', label: 'British Osteopathic Association' },
          { value: 'chartered_society_of_physiotherapy', label: 'Chartered Society of Physiotherapy' },
          { value: 'other', label: 'Other' },
        ];
    }
  };

  const specializationOptions = {
    sports_therapist: [
      { label: 'Sports Injury', value: 'sports_injury' },
      { label: 'Rehabilitation', value: 'rehabilitation' },
      { label: 'Strength Training', value: 'strength_training' },
      { label: 'Injury Prevention', value: 'injury_prevention' }
    ],
    massage_therapist: [
      { label: 'Sports Massage', value: 'sports_massage' },
      { label: 'Massage Therapy', value: 'massage_therapy' },
      { label: 'Rehabilitation', value: 'rehabilitation' }
    ],
    osteopath: [
      { label: 'Osteopathy', value: 'osteopathy' },
      { label: 'Rehabilitation', value: 'rehabilitation' },
      { label: 'Sports Injury', value: 'sports_injury' }
    ],
    client: []
  };


  // Show loading spinner while auth is loading or userProfile is not available
  if (authLoading || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
        {/* Sign Out Button - Top Right */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="absolute top-4 right-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
        
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground text-center">
              {!userProfile ? 'Loading your profile...' : 'Setting up your account...'}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              If this takes too long, try refreshing the page
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user needs role selection (practitioners without roles)
  if (!userProfile.user_role) {
    console.log('🎯 User needs role selection:', {
      userProfile: userProfile,
      user_role: userProfile.user_role,
      effectiveRole: effectiveRole,
      localStorageRole: localStorageRole,
      isRecentRoleSelection: isRecentRoleSelection
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-center mb-2">Select Your Role</h2>
            <p className="text-muted-foreground text-center mb-6">
              Please select your professional role to continue
            </p>
            <Button 
              onClick={() => {
                console.log('🔗 Navigating to role selection...');
                navigate('/auth/role-selection');
              }}
              className="w-full"
            >
              Choose Role
            </Button>
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Debug: user_role = {userProfile.user_role || 'null'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if no user profile
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
        {/* Sign Out Button - Top Right */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="absolute top-4 right-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
        
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-muted-foreground text-center mb-4">Unable to load your profile. Please try refreshing the page.</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">Refresh Page</Button>
              <Button variant="outline" onClick={handleSignOut} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 sm:p-6">
      {/* Debug Banner - Top Center */}
      {userProfile && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-2 text-sm">
          <strong>Debug:</strong> DB Role: {userProfile.user_role || 'NULL'} | 
          Effective: {effectiveRole || 'NULL'} | 
          Steps: {totalSteps} | 
          Type: {(effectiveRole === 'client' || effectiveRole === null) ? 'CLIENT' : 'PRACTITIONER'}
        </div>
      )}
      
      {/* Sign Out Button - Top Right */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="absolute top-4 right-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
      
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center p-4 sm:p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mr-3">
              <img 
                src="/src/assets/theramatemascot.png" 
                alt="TheraMate Mascot" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl sm:text-2xl font-bold">TheraMate</span>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Welcome, {userProfile?.first_name}!</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Let's set up your {getUserTypeLabel()} profile - Step {step} of {totalSteps}
          </CardDescription>
          {realtime?.onboardingProgress && (realtime.onboardingProgress.blockers?.length || 0) > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
              <p className="text-sm font-medium mb-1">Action required to continue</p>
              <ul className="text-sm list-disc list-inside">
                {realtime.onboardingProgress.blockers.includes('subscription') && (
                  <li>Complete subscription to unlock professional features</li>
                )}
                {realtime.onboardingProgress.blockers.includes('verification') && (
                  <li>Verification pending. You can proceed, but marketplace visibility is limited until verified</li>
                )}
              </ul>
            </div>
          )}
          {effectiveRole !== 'client' && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Completing your profile setup is required to start accepting clients and using all platform features.
              </p>
            </div>
          )}
          <Progress value={progress} className="mt-4" />
          
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Show validation errors if any */}
          {showValidationErrors && <ValidationErrorDisplay errors={validationErrors} />}
          
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <User className="h-5 w-5" />
                <span className="font-medium">Basic Information</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className={getFieldErrorClass('phone')}
                />
                {validationErrors.phone && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.phone}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State/Country"
                  value={formData.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className={getFieldErrorClass('location')}
                />
                {validationErrors.location && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.location}</p>
                )}
              </div>

              {effectiveRole !== 'client' && (
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio *</Label>
                  <textarea
                    id="bio"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${getFieldErrorClass('bio')}`}
                    placeholder="Tell us about your professional background and approach..."
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => handleFieldChange('bio', e.target.value)}
                  />
                  {validationErrors.bio && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.bio}</p>
                  )}
                </div>
              )}

            </div>
          )}

          {step === 2 && (effectiveRole === 'client' || effectiveRole === null) && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Health Goals & Preferences</span>
              </div>
              
              <div className="space-y-4">
                {/* First Name and Last Name fields for clients */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryGoal">What's your primary health goal? *</Label>
                  <Select onValueChange={(value) => setFormData({...formData, primaryGoal: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your main goal" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="pain_relief">Pain Relief</SelectItem>
                      <SelectItem value="injury_recovery">Injury Recovery</SelectItem>
                      <SelectItem value="performance_improvement">Performance Improvement</SelectItem>
                      <SelectItem value="stress_relief">Stress Relief</SelectItem>
                      <SelectItem value="general_wellness">General Wellness</SelectItem>
                      <SelectItem value="preventive_care">Preventive Care</SelectItem>
                      <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredTherapyTypes">Preferred therapy types</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Sports Therapy', value: 'sports_therapy' },
                      { label: 'Massage Therapy', value: 'massage_therapy' },
                      { label: 'Osteopathy', value: 'osteopathy' },
                      { label: 'Physiotherapy', value: 'physiotherapy' }
                    ].map((therapy) => (
                      <div key={therapy.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={therapy.value}
                          checked={formData.preferredTherapyTypes?.includes(therapy.value) || false}
                          onCheckedChange={(checked) => {
                            const currentTypes = formData.preferredTherapyTypes || [];
                            if (checked) {
                              setFormData({
                                ...formData,
                                preferredTherapyTypes: [...currentTypes, therapy.value]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                preferredTherapyTypes: currentTypes.filter(t => t !== therapy.value)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={therapy.value} className="text-sm">{therapy.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>


                <div className="p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    As a client, you can now start finding and booking sessions with qualified therapists in your area.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Search for therapists</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Book appointments</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Message therapists</span>
                    </div>
                  </div>
                </div>

                {/* Avatar Customization Option */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="h-5 w-5 text-primary" />
                    <span className="font-medium">Customize Your Avatar (Optional)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a personalized avatar to represent you on the platform. You can skip this and customize later from your profile.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="customizeAvatar"
                      checked={formData.customizeAvatar}
                      onCheckedChange={(checked) => {
                        setFormData({...formData, customizeAvatar: checked as boolean});
                        setShowAvatarCustomization(checked as boolean);
                      }}
                    />
                    <Label htmlFor="customizeAvatar" className="text-sm">
                      Yes, I'd like to customize my avatar
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Avatar Customization Step for Clients */}
          {step === 3 && (effectiveRole === 'client' || effectiveRole === null) && showAvatarCustomization && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <User className="h-5 w-5" />
                <span className="font-medium">Customize Your Avatar</span>
              </div>
              
              <div className="text-center mb-6">
                <p className="text-muted-foreground mb-4">
                  Personalize your avatar to represent you on the platform
                </p>
                
                {/* Avatar Preview */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <img
                      key={`avatar-${avatarKey}`}
                      src={generateAvatarUrl(
                        `${formData.firstName}${formData.lastName}`,
                        formData.avatarPreferences
                      )}
                      alt="Avatar Preview"
                      className="w-24 h-24 rounded-full border-4 border-primary/20"
                      onError={(e) => {
                        console.error('Avatar failed to load:', e);
                        // Fallback to initials if avatar fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'w-24 h-24 rounded-full border-4 border-primary/20 bg-primary text-white flex items-center justify-center text-xl font-bold';
                        fallback.textContent = `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`.toUpperCase();
                        target.parentNode?.appendChild(fallback);
                      }}
                    />
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Hair Color */}
                <div className="space-y-2">
                  <Label htmlFor="hairColor">Hair Color</Label>
                  <Select 
                    value={formData.avatarPreferences.hairColor} 
                    onValueChange={(value) => {
                      console.log('🎨 Hair color changed to:', value);
                      setFormData({
                        ...formData,
                        avatarPreferences: {...formData.avatarPreferences, hairColor: value}
                      });
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hair color" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_OPTIONS.hairColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clothing Color */}
                <div className="space-y-2">
                  <Label htmlFor="clothingColor">Clothing Color</Label>
                  <Select 
                    value={formData.avatarPreferences.clothingColor} 
                    onValueChange={(value) => {
                      console.log('🎨 Clothing color changed to:', value);
                      setFormData({
                        ...formData,
                        avatarPreferences: {...formData.avatarPreferences, clothingColor: value}
                      });
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select clothing color" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_OPTIONS.clothingColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Skin Color */}
                <div className="space-y-2">
                  <Label htmlFor="skinColor">Skin Tone</Label>
                  <Select 
                    value={formData.avatarPreferences.skinColor} 
                    onValueChange={(value) => {
                      console.log('🎨 Skin color changed to:', value);
                      setFormData({
                        ...formData,
                        avatarPreferences: {...formData.avatarPreferences, skinColor: value}
                      });
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skin tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVATAR_OPTIONS.skinColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Accessories */}
                <div className="space-y-2">
                  <Label htmlFor="accessories">Accessories</Label>
                  <Select 
                    value={formData.avatarPreferences.accessories?.[0] || 'none'} 
                    onValueChange={(value) => {
                      console.log('🎨 Accessories changed to:', value);
                      setFormData({
                        ...formData,
                        avatarPreferences: {...formData.avatarPreferences, accessories: value === 'none' ? [] : [value]}
                      });
                      setAvatarKey(prev => prev + 1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select accessories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {AVATAR_OPTIONS.accessories.map((accessory) => (
                        <SelectItem key={accessory.value} value={accessory.value}>
                          {accessory.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> You can always change your avatar later from your profile settings.
                </p>
              </div>
            </div>
          )}

          {step === 2 && effectiveRole !== 'client' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary mb-4">
                <Award className="h-5 w-5" />
                <span className="font-medium">Professional Details</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience *</Label>
                <Select onValueChange={(value) => setFormData({...formData, experience_years: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="1">1-2 years</SelectItem>
                    <SelectItem value="3">3-5 years</SelectItem>
                    <SelectItem value="6">6-10 years</SelectItem>
                    <SelectItem value="11">11+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label htmlFor="professionalBody">Professional Body Membership OR INSURANCE *</Label>
                <Select 
                  value={formData.professional_body || ""} 
                  onValueChange={(value) => setFormData({...formData, professional_body: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your professional body or insurance" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {getProfessionalBodies().map((body) => (
                      <SelectItem key={body.value} value={body.value}>{body.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {formData.professional_body === 'other' && (
                  <div className="space-y-2">
                    <Label htmlFor="professionalBodyOther">Please specify *</Label>
                    <Input
                      id="professionalBodyOther"
                      placeholder="Enter your professional body or insurance details"
                      value={formData.professional_body_other || ""}
                      onChange={(e) => setFormData({...formData, professional_body_other: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification">Do you have an ITMMIF / ATMMIF or equivalent qualification? *</Label>
                <Select 
                  value={formData.qualification_type || ""} 
                  onValueChange={(value) => setFormData({...formData, qualification_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your qualification type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="itmmif">ITMMIF</SelectItem>
                    <SelectItem value="atmmif">ATMMIF</SelectItem>
                    <SelectItem value="equivalent">Equivalent Qualification</SelectItem>
                    <SelectItem value="none">No qualification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.qualification_type && formData.qualification_type !== 'none' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="qualificationUpload">Upload your qualification certificate *</Label>
                    <Input
                      id="qualificationUpload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({...formData, qualification_file: file});
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PDF, JPG, PNG (Max 10MB)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qualificationExpiry">Qualification expiry date *</Label>
                    <Input
                      id="qualificationExpiry"
                      type="date"
                      value={formData.qualification_expiry || ""}
                      onChange={(e) => setFormData({...formData, qualification_expiry: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the expiry date of your qualification
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  placeholder="Enter your professional registration number"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                />
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <Shield className="w-3 h-3 inline mr-1" />
                  Your registration number is used to verify your qualifications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications & Certifications</Label>
                <Textarea
                  id="qualifications"
                  value={formData.qualifications.join(', ')}
                  onChange={(e) => setFormData({...formData, qualifications: e.target.value.split(',').map(q => q.trim()).filter(q => q)})}
                  placeholder="List your qualifications, certifications, and training (separate each with a comma)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Example: Level 3 Sports Massage, First Aid Certificate, Anatomy & Physiology Diploma
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="professionalStatement">Professional Statement</Label>
                <Textarea
                  id="professionalStatement"
                  placeholder="Share your professional approach and what makes you unique..."
                  value={formData.professional_statement}
                  onChange={(e) => setFormData({...formData, professional_statement: e.target.value})}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed prominently on your profile to help clients understand your approach
                </p>
              </div>
            </div>
          )}

          {step === 3 && effectiveRole !== 'client' && (
            <AvailabilitySetup
              availability={formData.availability}
              timezone={formData.timezone}
              onAvailabilityChange={(availability) => setFormData({...formData, availability})}
              onTimezoneChange={(timezone) => setFormData({...formData, timezone})}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 4 && effectiveRole !== 'client' && (
            <div className="space-y-6">
              {subscribed ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-green-100">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-green-800">Subscription Active!</h3>
                    <p className="text-green-600">Your {subscriptionTier} plan is now active. You can proceed to complete your profile setup.</p>
                  </div>
                  <Button onClick={handleNext} className="w-full">
                    Continue to Service Setup
                  </Button>
                </div>
              ) : subscriptionCompleted && subscriptionVerifying ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-blue-100">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-blue-800">Verifying Subscription...</h3>
                    <p className="text-blue-600">Please wait while we verify your payment.</p>
                  </div>
                </div>
              ) : subscriptionCompleted && !subscribed ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-yellow-100">
                      <Shield className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-yellow-800">Payment Processing</h3>
                    <p className="text-yellow-600">We're processing your payment. If you've completed payment, click below to verify.</p>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={handleVerifySubscription} className="w-full" disabled={subscriptionVerifying}>
                      {subscriptionVerifying ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </span>
                      ) : (
                        'Verify Payment'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setSubscriptionCompleted(false)} className="w-full">
                      Select Different Plan
                    </Button>
                  </div>
                </div>
              ) : (
                <SubscriptionSelection
                  onSubscriptionSelected={handleSubscriptionSelected}
                  onBack={handleBack}
                  loading={loading}
                />
              )}
            </div>
          )}

          {step === 6 && effectiveRole !== 'client' && (
            <LocationSetup
              onComplete={(locationData) => {
                setFormData({
                  ...formData,
                  location: locationData.address,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                  service_radius_km: locationData.serviceRadius
                });
                handleNext();
              }}
              initialData={{
                address: formData.location,
                latitude: formData.latitude,
                longitude: formData.longitude,
                serviceRadius: formData.service_radius_km
              }}
            />
          )}

          {step === 5 && effectiveRole !== 'client' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Services Offered (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Massage', value: 'massage' },
                    { label: 'Cupping Therapy', value: 'cupping' },
                    { label: 'Acupuncture', value: 'acupuncture' },
                    { label: 'Manipulations', value: 'manipulations' },
                    { label: 'Mobilisation', value: 'mobilisation' },
                    { label: 'Stretching', value: 'stretching' }
                  ].map((svc) => (
                    <div key={svc.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`svc_${svc.value}`}
                        checked={formData.services_offered.includes(svc.value)}
                        onCheckedChange={(checked) => {
                          const current = formData.services_offered;
                          setFormData({
                            ...formData,
                            services_offered: checked
                              ? [...current, svc.value]
                              : current.filter((v) => v !== svc.value),
                          });
                        }}
                      />
                      <Label htmlFor={`svc_${svc.value}`} className="text-sm">{svc.label}</Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use your bio and pricing to detail specific modalities (e.g., deep tissue, sports massage).
                </p>
              </div>
              <div className="flex items-center space-x-2 text-primary mb-4">
                <Award className="h-5 w-5" />
                <span className="font-medium">Service Setup & Final Details</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (£) *</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  placeholder="e.g., 60"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  min="20"
                  max="200"
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed on your profile and can be changed later
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatmentPhilosophy">Treatment Philosophy</Label>
                <Textarea
                  id="treatmentPhilosophy"
                  placeholder="Describe your approach to treatment and client care..."
                  value={formData.treatment_philosophy}
                  onChange={(e) => setFormData({...formData, treatment_philosophy: e.target.value})}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Help clients understand your treatment methodology and approach
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseTime">Response Time (hours)</Label>
                <Select onValueChange={(value) => setFormData({...formData, response_time_hours: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="How quickly do you respond to messages?" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="1">Within 1 hour</SelectItem>
                    <SelectItem value="2">Within 2 hours</SelectItem>
                    <SelectItem value="4">Within 4 hours</SelectItem>
                    <SelectItem value="8">Within 8 hours</SelectItem>
                    <SelectItem value="24">Within 24 hours</SelectItem>
                    <SelectItem value="48">Within 48 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This helps set client expectations for communication
                </p>
              </div>


              <div className="space-y-3 pt-4">
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={() => {
                      Analytics.trackEvent('onboarding_services_selected', { services: formData.services_offered });
                      handleNext();
                    }} 
                    className="flex-1"
                    disabled={loading || !subscribed || !formData.hourly_rate || !formData.professional_body || !formData.registration_number || !formData.qualification_type || (formData.qualification_type !== 'none' && (!formData.qualification_file || !formData.qualification_expiry)) || (formData.professional_body === 'other' && !formData.professional_body_other)}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </span>
                    ) : !subscribed ? (
                      'Complete Subscription First'
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </div>
                
                {/* Sign Out Option */}
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          )}


          {/* Navigation for non-final steps */}
          {((step <= totalSteps && (effectiveRole === 'client' || effectiveRole === null)) || 
            (step < 3 && effectiveRole !== 'client' && effectiveRole !== null) ||
            (step === 3 && effectiveRole !== 'client' && effectiveRole !== null && !subscribed && !subscriptionCompleted) ||
            (step === 5 && effectiveRole !== 'client' && effectiveRole !== null && subscribed)) && (
            <div className="space-y-3 pt-4">
              <div className="flex space-x-2">
                {step > 1 && (
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                )}
                <Button onClick={handleNext} className="flex-1" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    step === totalSteps ? 'Complete Setup' : 'Continue'
                  )}
                </Button>
              </div>
              
              {/* Sign Out Option */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;