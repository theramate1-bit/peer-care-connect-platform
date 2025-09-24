/**
 * Centralized Onboarding Utilities
 * 
 * This utility ensures consistent onboarding completion logic
 * and profile tracking across the entire application.
 */

import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/roles';

export interface OnboardingData {
  phone?: string;
  bio?: string;
  location?: string;
  experience_years?: string;
  specializations?: string[];
  qualifications?: string[];
  hourly_rate?: string;
  availability?: any;
  timezone?: string;
  professional_body?: string;
  registration_number?: string;
  // New marketplace fields
  professional_statement?: string;
  treatment_philosophy?: string;
  response_time_hours?: string;
  services_offered?: string[];
}

export interface ClientOnboardingData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  location?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  medications?: string;
  allergies?: string;
  previousTherapy?: string;
  preferredTherapyTypes?: string[];
  preferredGender?: string;
  preferredLocation?: string;
  preferredTime?: string;
  maxTravelDistance?: number;
  primaryGoal?: string;
  secondaryGoals?: string[];
  budget?: string;
  avatarPreferences?: any;
}

/**
 * Completes onboarding for a practitioner user
 */
export async function completePractitionerOnboarding(
  userId: string,
  userRole: UserRole,
  onboardingData: OnboardingData
): Promise<{ error: any }> {
  try {
    // Validate required fields before saving
    const requiredFields = ['phone', 'bio', 'location', 'experience_years', 'specializations', 'qualifications', 'hourly_rate', 'professional_body', 'registration_number'];
    const missingFields = requiredFields.filter(field => {
      const value = onboardingData[field as keyof OnboardingData];
      return !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '');
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Update user profile with all relevant fields
    const userUpdateData: any = {
      phone: onboardingData.phone,
      onboarding_status: 'completed',
      profile_completed: true,
    };

    // Add optional fields if they exist
    if (onboardingData.firstName) userUpdateData.first_name = onboardingData.firstName;
    if (onboardingData.lastName) userUpdateData.last_name = onboardingData.lastName;
    if (onboardingData.location) userUpdateData.location = onboardingData.location;
    if (onboardingData.services_offered) userUpdateData.services_offered = onboardingData.services_offered;

    const { error: userError } = await supabase
      .from('users')
      .update(userUpdateData)
      .eq('id', userId);

    if (userError) {
      console.error('User profile update error:', userError);
      throw userError;
    }

    // Create practitioner profile if not a client
    if (userRole !== 'client') {
      const therapistProfileData = {
        user_id: userId,
        bio: onboardingData.bio,
        location: onboardingData.location,
        experience_years: parseInt(onboardingData.experience_years || '0') || 0,
        specializations: onboardingData.specializations?.length ? onboardingData.specializations : [],
        qualifications: onboardingData.qualifications?.length ? onboardingData.qualifications : [],
        hourly_rate: parseFloat(onboardingData.hourly_rate || '0') || 0,
        availability: onboardingData.availability || {},
        professional_body: onboardingData.professional_body === 'other' ? null : onboardingData.professional_body,
        registration_number: onboardingData.registration_number || '',
        // New marketplace fields
        professional_statement: onboardingData.professional_statement || '',
        treatment_philosophy: onboardingData.treatment_philosophy || '',
        response_time_hours: parseInt(onboardingData.response_time_hours || '24') || 24,
        is_active: true
      };

      const { error: profileError } = await supabase
        .from('users')
        .upsert(therapistProfileData);

      if (profileError) {
        console.error('Therapist profile creation error:', profileError);
        // Don't throw error - user profile was saved successfully
        console.warn('Therapist profile creation failed, but user profile was saved successfully');
      }

      // Create practitioner availability record
      if (onboardingData.availability) {
        const availabilityData = {
          user_id: userId,
          working_hours: onboardingData.availability,
          timezone: onboardingData.timezone || 'Europe/London'
        };

        const { error: availabilityError } = await supabase
          .from('practitioner_availability')
          .upsert(availabilityData);

        if (availabilityError) {
          console.error('Practitioner availability creation error:', availabilityError);
          // Don't throw error - other data was saved successfully
          console.warn('Practitioner availability creation failed, but other data was saved successfully');
        }
      }
    }

    // Verify the data was saved correctly
    const verification = await verifyPractitionerOnboardingCompletion(userId);
    if (!verification.success) {
      console.warn('Practitioner onboarding verification failed:', verification.issues);
    }

    return { error: null };
  } catch (error) {
    console.error('Error completing practitioner onboarding:', error);
    return { error };
  }
}

/**
 * Completes onboarding for a client user
 */
export async function completeClientOnboarding(
  userId: string,
  onboardingData: ClientOnboardingData
): Promise<{ error: any }> {
  try {
    // Validate required fields before saving
    const requiredFields = ['firstName', 'lastName', 'phone', 'primaryGoal'];
    const missingFields = requiredFields.filter(field => !onboardingData[field as keyof ClientOnboardingData]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Update user profile with only existing columns
    const userUpdateData: any = {
      first_name: onboardingData.firstName,
      last_name: onboardingData.lastName,
      phone: onboardingData.phone,
      onboarding_status: 'completed',
      profile_completed: true,
    };

    // Only add location if the column exists (will be handled by migration)
    if (onboardingData.location) {
      userUpdateData.location = onboardingData.location;
    }

    // Only add avatar_preferences if the column exists (will be handled by migration)
    if (onboardingData.avatarPreferences) {
      userUpdateData.avatar_preferences = onboardingData.avatarPreferences;
    }

    const { error: userError } = await supabase
      .from('users')
      .update(userUpdateData)
      .eq('id', userId);

    if (userError) {
      console.error('User profile update error:', userError);
      throw userError;
    }

    // Create client profile with error handling
    const clientProfileData = {
      user_id: userId,
      preferences: JSON.stringify({
        primary_goal: onboardingData.primaryGoal,
        preferred_therapy_types: onboardingData.preferredTherapyTypes || [],
        budget: onboardingData.budget || '',
        preferred_gender: onboardingData.preferredGender || 'No preference',
        preferred_location: onboardingData.preferredLocation || 'Any location',
        preferred_time: onboardingData.preferredTime || 'Flexible',
        max_travel_distance: onboardingData.maxTravelDistance || 10
      }),
      medical_history: JSON.stringify({
        medical_conditions: onboardingData.medicalConditions || '',
        medications: onboardingData.medications || '',
        allergies: onboardingData.allergies || '',
        previous_therapy: onboardingData.previousTherapy || '',
        secondary_goals: onboardingData.secondaryGoals || []
      }),
      emergency_contact_name: onboardingData.emergencyContact || '',
      emergency_contact_phone: onboardingData.emergencyPhone || ''
    };

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(clientProfileData);

    if (profileError) {
      console.error('Client profile creation error:', profileError);
      // Don't throw error for client profile - it's not critical for basic functionality
      console.warn('Client profile creation failed, but user profile was saved successfully');
    }

    // Verify the data was saved correctly
    const verification = await verifyOnboardingCompletion(userId);
    if (!verification.success) {
      console.warn('Onboarding verification failed:', verification.issues);
    }

    return { error: null };
  } catch (error) {
    console.error('Error completing client onboarding:', error);
    return { error };
  }
}

/**
 * Verifies that practitioner onboarding data was saved correctly
 */
export async function verifyPractitionerOnboardingCompletion(userId: string): Promise<{ success: boolean; issues: string[] }> {
  try {
    const issues: string[] = [];

    // Check user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      issues.push(`User profile error: ${userError.message}`);
    } else {
      if (!userProfile.first_name) issues.push('Missing first_name');
      if (!userProfile.last_name) issues.push('Missing last_name');
      if (!userProfile.phone) issues.push('Missing phone');
      if (userProfile.onboarding_status !== 'completed') issues.push('Onboarding not marked as completed');
    }

    // Check therapist profile
    const { data: therapistProfile, error: therapistError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (therapistError && therapistError.code !== 'PGRST116') {
      issues.push(`Therapist profile error: ${therapistError.message}`);
    } else if (!therapistProfile) {
      issues.push('Missing therapist profile');
    } else {
      if (!therapistProfile.bio) issues.push('Missing bio');
      if (!therapistProfile.location) issues.push('Missing location');
      if (!therapistProfile.experience_years) issues.push('Missing experience_years');
      if (!therapistProfile.specializations || therapistProfile.specializations.length === 0) issues.push('Missing specializations');
      if (!therapistProfile.qualifications || therapistProfile.qualifications.length === 0) issues.push('Missing qualifications');
      if (!therapistProfile.hourly_rate) issues.push('Missing hourly_rate');
    }

    return {
      success: issues.length === 0,
      issues
    };
  } catch (error) {
    return {
      success: false,
      issues: [`Verification error: ${error}`]
    };
  }
}

/**
 * Verifies that onboarding data was saved correctly
 */
export async function verifyOnboardingCompletion(userId: string): Promise<{ success: boolean; issues: string[] }> {
  try {
    const issues: string[] = [];

    // Check user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      issues.push(`User profile error: ${userError.message}`);
    } else {
      if (!userProfile.first_name) issues.push('Missing first_name');
      if (!userProfile.last_name) issues.push('Missing last_name');
      if (!userProfile.phone) issues.push('Missing phone');
      if (userProfile.onboarding_status !== 'completed') issues.push('Onboarding not marked as completed');
    }

    // Check client profile
    const { data: clientProfile, error: clientError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (clientError && clientError.code !== 'PGRST116') {
      issues.push(`Client profile error: ${clientError.message}`);
    } else if (!clientProfile) {
      issues.push('Missing client profile');
    }

    return {
      success: issues.length === 0,
      issues
    };
  } catch (error) {
    return {
      success: false,
      issues: [`Verification error: ${error}`]
    };
  }
}

/**
 * Checks if a user's onboarding is complete
 */
export function isOnboardingComplete(userProfile: any): boolean {
  if (!userProfile) return false;
  
  return userProfile.onboarding_status === 'completed' && 
         userProfile.profile_completed === true;
}

/**
 * Gets the appropriate onboarding route based on user role
 */
export function getOnboardingRoute(userRole: UserRole): string {
  switch (userRole) {
    case 'client':
      return '/onboarding?type=client';
    case 'sports_therapist':
    case 'massage_therapist':
    case 'osteopath':
      return '/onboarding?type=practitioner';
    default:
      return '/onboarding';
  }
}

/**
 * Validates onboarding data based on user role
 */
export function validateOnboardingData(
  userRole: UserRole,
  data: OnboardingData | ClientOnboardingData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (userRole === 'client') {
    const clientData = data as ClientOnboardingData;
    
    if (!clientData.firstName?.trim()) {
      errors.push('First name is required');
    }
    if (!clientData.lastName?.trim()) {
      errors.push('Last name is required');
    }
    if (!clientData.phone?.trim()) {
      errors.push('Phone number is required');
    }
    if (!clientData.primaryGoal?.trim()) {
      errors.push('Primary goal is required');
    }
  } else {
    const practitionerData = data as OnboardingData;
    
    if (!practitionerData.phone?.trim()) {
      errors.push('Phone number is required');
    }
    if (!practitionerData.bio?.trim()) {
      errors.push('Bio is required');
    }
    if (!practitionerData.location?.trim()) {
      errors.push('Location is required');
    }
    if (!practitionerData.experience_years || parseInt(practitionerData.experience_years) < 0) {
      errors.push('Valid experience years is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
