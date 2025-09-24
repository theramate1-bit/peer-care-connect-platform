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
    title: 'Health Goals',
    requiredFields: ['primary_goal', 'timeline'],
    optionalFields: ['preferredTherapyTypes'],
    validationRules: {
      primary_goal: (value: string) => ({
        isValid: value && value.trim().length >= 10,
        errors: value && value.trim().length < 10 ? ['Please describe your primary health goal in at least 10 characters'] : [],
        warnings: []
      }),
      timeline: (value: string) => ({
        isValid: !!value,
        errors: !value ? ['Please select your preferred timeline'] : [],
        warnings: []
      }),
      preferredTherapyTypes: (value: string[]) => ({
        isValid: !value || value.length > 0,
        errors: [],
        warnings: value && value.length === 0 ? ['Consider selecting at least one therapy type you\'re interested in'] : []
      })
    }
  }
];

export const PRACTITIONER_ONBOARDING_STEPS: StepValidation[] = [
  {
    step: 1,
    title: 'Basic Information',
    requiredFields: ['phone', 'location'],
    optionalFields: [],
    validationRules: {
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
  {
    step: 2,
    title: 'Professional Details',
    requiredFields: ['bio', 'experience_years', 'professional_body', 'registration_number'],
    optionalFields: ['qualifications', 'professional_statement'],
    validationRules: {
      bio: (value: string) => ({
        isValid: value && value.trim().length >= 50,
        errors: !value ? ['Bio is required'] : value.trim().length < 50 ? ['Bio must be at least 50 characters'] : [],
        warnings: []
      }),
      experience_years: (value: number) => ({
        isValid: value !== undefined && value >= 0 && value <= 50,
        errors: value === undefined ? ['Years of experience is required'] : value < 0 ? ['Experience cannot be negative'] : value > 50 ? ['Please enter a realistic number of years'] : [],
        warnings: value > 30 ? ['That\'s a lot of experience! Please verify this is correct.'] : []
      }),
      professional_body: (value: string) => ({
        isValid: value && value.trim().length >= 3,
        errors: !value ? ['Professional body is required'] : value.trim().length < 3 ? ['Professional body name must be at least 3 characters'] : [],
        warnings: []
      }),
      registration_number: (value: string) => ({
        isValid: value && value.trim().length >= 5,
        errors: !value ? ['Registration number is required'] : value.trim().length < 5 ? ['Registration number must be at least 5 characters'] : [],
        warnings: []
      }),
      qualifications: (value: string[]) => ({
        isValid: !value || value.length <= 20,
        errors: value && value.length > 20 ? ['Please limit qualifications to 20 or fewer'] : [],
        warnings: []
      })
    }
  },
  {
    step: 3,
    title: 'Subscription Selection',
    requiredFields: [],
    optionalFields: [],
    validationRules: {}
  },
  {
    step: 4,
    title: 'Service Setup & Final Details',
    requiredFields: ['hourly_rate'],
    optionalFields: ['treatment_philosophy', 'response_time_hours'],
    validationRules: {
      hourly_rate: (value: number) => ({
        isValid: value !== undefined && value >= 20 && value <= 500,
        errors: value === undefined ? ['Hourly rate is required'] : value < 20 ? ['Hourly rate should be at least £20'] : value > 500 ? ['Hourly rate seems unusually high'] : [],
        warnings: value > 200 ? ['This is a premium rate. Please ensure it\'s competitive.'] : []
      })
    }
  }
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
  
  if (!stepConfig) {
    return {
      isValid: false,
      errors: ['Invalid step number'],
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
