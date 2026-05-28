/**
 * Onboarding Validation Utilities
 * Provides step-by-step validation for the onboarding process
 */

export interface OnboardingData {
  phone?: string;
  location?: string;
  bio?: string;
  experience_years?: number;
  specializations?: string[];
  qualifications?: string[];
  hourly_rate?: number;
  availability?: Record<string, any>;
  professional_body?: string;
  registration_number?: string;
  // Client-specific fields
  first_name?: string;
  last_name?: string;
  primary_goal?: string;
  preferredTherapyTypes?: string[];
  timeline?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StepValidation {
  step: number;
  title: string;
  requiredFields: string[];
  optionalFields: string[];
  validationRules: Record<string, (value: any) => ValidationResult>;
}

// Step definitions for different user types
export const CLIENT_ONBOARDING_STEPS: StepValidation[] = [
  {
    step: 1,
    title: 'Personal Information',
    requiredFields: ['first_name', 'last_name'],
    optionalFields: ['phone'],
    validationRules: {
      first_name: (value: string) => ({
        isValid: value && value.trim().length >= 2,
        errors: value && value.trim().length < 2 ? ['First name must be at least 2 characters'] : [],
        warnings: []
      }),
      last_name: (value: string) => ({
        isValid: value && value.trim().length >= 2,
        errors: value && value.trim().length < 2 ? ['Last name must be at least 2 characters'] : [],
        warnings: []
      }),
      phone: (value: string) => ({
        isValid: !value || /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, '')),
        errors: value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, '')) ? ['Please enter a valid phone number'] : [],
        warnings: []
      })
    }
  },
  {
    step: 2,
    title: 'Personal Information',
    requiredFields: ['first_name', 'last_name'],
    optionalFields: [],
    validationRules: {
      first_name: (value: string) => ({
        isValid: value && value.trim().length >= 2,
        errors: value && value.trim().length < 2 ? ['First name must be at least 2 characters'] : [],
        warnings: []
      }),
      last_name: (value: string) => ({
        isValid: value && value.trim().length >= 2,
        errors: value && value.trim().length < 2 ? ['Last name must be at least 2 characters'] : [],
        warnings: []
      })
    }
  }
];

export const PRACTITIONER_ONBOARDING_STEPS: StepValidation[] = [
  {
    step: 1,
    title: 'Basic Information',
    requiredFields: ['firstName', 'lastName', 'phone', 'location'], // Added firstName, lastName
    optionalFields: [],
    validationRules: {
      firstName: (value: string) => ({
        isValid: value && value.trim().length >= 2,
        errors: value && value.trim().length < 2 ? ['First name must be at least 2 characters'] : [],
        warnings: []
      }),
      lastName: (value: string) => ({
        isValid: value && value.trim().length >= 2,
        errors: value && value.trim().length < 2 ? ['Last name must be at least 2 characters'] : [],
        warnings: []
      }),
      phone: (value: string) => ({
        isValid: value && /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, '')),
        errors: !value ? ['Phone number is required'] : !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, '')) ? ['Please enter a valid phone number'] : [],
        warnings: []
      }),
      location: (value: string) => ({
        isValid: value && value.trim().length >= 3,
        errors: !value ? ['Location is required'] : value.trim().length < 3 ? ['Please enter a valid location'] : [],
        warnings: []
      })
    }
  },
  // Step 2 (Stripe) and Step 3 (Subscription) are handled by specific components and checks, 
  // not generic field validation.
];

/**
 * Validates a specific step of the onboarding process
 */
export function validateOnboardingStep(
  step: number,
  data: OnboardingData,
  userRole: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath'
): ValidationResult {
  const steps = userRole === 'client' ? CLIENT_ONBOARDING_STEPS : PRACTITIONER_ONBOARDING_STEPS;
  const stepConfig = steps.find(s => s.step === step);
  
  // If no validation config exists for this step (e.g. Stripe/Subscription steps), return valid
  if (!stepConfig) {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  for (const field of stepConfig.requiredFields) {
    const value = data[field as keyof OnboardingData];
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${field} is required`);
    }
  }

  // Apply validation rules
  for (const [field, validator] of Object.entries(stepConfig.validationRules)) {
    const value = data[field as keyof OnboardingData];
    const result = validator(value);
    
    if (!result.isValid) {
      errors.push(...result.errors);
    }
    
    warnings.push(...result.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates the entire onboarding data
 */
export function validateOnboardingData(
  data: OnboardingData,
  userRole: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath'
): ValidationResult {
  const steps = userRole === 'client' ? CLIENT_ONBOARDING_STEPS : PRACTITIONER_ONBOARDING_STEPS;
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const stepConfig of steps) {
    const result = validateOnboardingStep(stepConfig.step, data, userRole);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Gets the next incomplete step
 */
export function getNextIncompleteStep(
  data: OnboardingData,
  userRole: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath'
): number {
  const steps = userRole === 'client' ? CLIENT_ONBOARDING_STEPS : PRACTITIONER_ONBOARDING_STEPS;
  
  for (const stepConfig of steps) {
    const result = validateOnboardingStep(stepConfig.step, data, userRole);
    if (!result.isValid) {
      return stepConfig.step;
    }
  }
  
  return steps.length; // All steps completed
}

/**
 * Gets completion percentage
 */
export function getOnboardingProgress(
  data: OnboardingData,
  userRole: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath'
): number {
  const steps = userRole === 'client' ? CLIENT_ONBOARDING_STEPS : PRACTITIONER_ONBOARDING_STEPS;
  let completedSteps = 0;
  
  for (const stepConfig of steps) {
    const result = validateOnboardingStep(stepConfig.step, data, userRole);
    if (result.isValid) {
      completedSteps++;
    }
  }
  
  return (completedSteps / steps.length) * 100;
}
