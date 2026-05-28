/**
 * Centralized Onboarding Utilities
 * 
 * This utility ensures consistent onboarding completion logic
 * and profile tracking across the entire application.
 */

import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/roles';

/**
 * Retry a database operation with exponential backoff
 * Critical for ensuring onboarding status updates don't fail silently
 */
async function retryDatabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  maxRetries: number = 3,
  operationName: string = 'database operation'
): Promise<{ data: T | null; error: any }> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      if (!result.error) {
        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
        return result;
      }
      
      lastError = result.error;
      console.warn(`⚠️ ${operationName} attempt ${attempt}/${maxRetries} failed:`, result.error);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = Math.pow(2, attempt - 1) * 500;
        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error;
      console.error(`❌ ${operationName} attempt ${attempt}/${maxRetries} threw exception:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ ${operationName} failed after ${maxRetries} attempts`);
  return { data: null, error: lastError };
}

/**
 * Ensures the onboarding status is set to 'completed' with verification
 * This is the CRITICAL update that must succeed for onboarding to be complete
 */
async function ensureOnboardingStatusCompleted(
  userId: string,
  additionalData: Record<string, any> = {}
): Promise<{ success: boolean; error?: any }> {
  const updateData = {
    onboarding_status: 'completed' as const,
    profile_completed: true,
    treatment_exchange_enabled: true,
    is_active: true,
    updated_at: new Date().toISOString(),
    ...additionalData
  };
  
  // First, perform the update with retry
  const updateResult = await retryDatabaseOperation(
    async () => {
      const result = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('onboarding_status, profile_completed')
        .single();
      return result;
    },
    3,
    'onboarding status update'
  );
  
  if (updateResult.error) {
    console.error('❌ CRITICAL: Failed to update onboarding status after retries:', updateResult.error);
    return { success: false, error: updateResult.error };
  }
  
  // Verify the update actually persisted (belt and suspenders)
  const verifyResult = await supabase
    .from('users')
    .select('onboarding_status, profile_completed')
    .eq('id', userId)
    .single();
  
  if (verifyResult.error) {
    console.error('❌ Failed to verify onboarding status update:', verifyResult.error);
    return { success: false, error: verifyResult.error };
  }
  
  const isComplete = verifyResult.data?.onboarding_status === 'completed' && 
                     verifyResult.data?.profile_completed === true;
  
  if (!isComplete) {
    console.error('❌ CRITICAL: Onboarding status verification failed!', {
      expected: { onboarding_status: 'completed', profile_completed: true },
      actual: verifyResult.data
    });
    
    // One more attempt with direct update
    console.log('🔄 Attempting emergency status fix...');
    const emergencyResult = await supabase
      .from('users')
      .update({ 
        onboarding_status: 'completed', 
        profile_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (emergencyResult.error) {
      return { success: false, error: new Error('Failed to set onboarding status even after emergency fix') };
    }
    
    // Final verification
    const finalVerify = await supabase
      .from('users')
      .select('onboarding_status, profile_completed')
      .eq('id', userId)
      .single();
    
    if (finalVerify.data?.onboarding_status !== 'completed') {
      return { success: false, error: new Error('Onboarding status still not completed after all attempts') };
    }
  }
  
  console.log('✅ Onboarding status successfully set to completed and verified');
  return { success: true };
}

/**
 * Sets onboarding status to 'in_progress' when user starts onboarding
 * This provides a clear state transition: pending -> in_progress -> completed
 */
export async function markOnboardingInProgress(userId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        onboarding_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      // Only update if currently 'pending' to avoid overwriting 'completed'
      .eq('onboarding_status', 'pending');
    
    if (error) {
      console.error('Failed to mark onboarding as in_progress:', error);
      return { error };
    }
    
    console.log('✅ Onboarding status set to in_progress for user:', userId);
    return { error: null };
  } catch (error) {
    console.error('Exception marking onboarding in_progress:', error);
    return { error };
  }
}

export interface OnboardingData {
  phone?: string;
  bio?: string;
  location?: string;
  experience_years?: string;
  specializations?: string[];
  qualifications?: string[];
  availability?: any;
  timezone?: string;
  professional_body?: string;
  professional_body_other?: string;
  registration_number?: string;
  qualification_type?: string;
  qualification_other?: string;
  qualification_file?: File | null;
  qualification_expiry?: string;
  qualification_file_url?: string;
  // New marketplace fields
  professional_statement?: string;
  treatment_philosophy?: string;
  response_time_hours?: string;
  services_offered?: string[];
  firstName?: string;
  lastName?: string;
  has_liability_insurance?: boolean;
  // Mobile therapist fields
  therapist_type?: 'clinic_based' | 'mobile' | 'hybrid';
  clinic_address?: string;
  clinic_latitude?: number | null;
  clinic_longitude?: number | null;
  base_address?: string;
  base_latitude?: number | null;
  base_longitude?: number | null;
  mobile_service_radius_km?: number | null;
  // Structured address fields (primary practice address)
  address_line1?: string;
  address_line2?: string;
  address_city?: string;
  address_county?: string;
  address_postcode?: string;
  address_country?: string;
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
 * Complete onboarding for a practitioner user
 * 
 * This is the main onboarding function for practitioners. It:
 * 1. Validates required fields (phone, location, firstName, lastName)
 * 2. Handles qualification file upload if provided
 * 3. Updates user profile with onboarding data
 * 4. Sets onboarding_status to 'completed'
 * 5. Enables treatment exchange by default
 * 
 * CRITICAL: firstName and lastName are required (NOT NULL in database)
 * 
 * @param userId - User ID to complete onboarding for
 * @param userRole - User role (must be practitioner type)
 * @param onboardingData - Onboarding form data
 * @returns Object with error if any occurred
 * 
 * @throws Error if required fields are missing or database update fails
 * 
 * @example
 * ```typescript
 * const { error } = await completePractitionerOnboarding(
 *   userId,
 *   'sports_therapist',
 *   {
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     phone: '+44123456789',
 *     location: 'London, UK',
 *     bio: 'Experienced sports therapist...'
 *   }
 * );
 * 
 * if (error) {
 *   console.error('Onboarding failed:', error);
 * }
 * ```
 */
export async function completePractitionerOnboarding(
  userId: string,
  userRole: UserRole,
  onboardingData: OnboardingData
): Promise<{ error: any }> {
  try {
    // Validate only essential required fields for initial onboarding
    // phone and location are the minimal set for practitioners
    const requiredFields = ['phone', 'location'];
    const missingFields = requiredFields.filter(field => {
      const value = onboardingData[field as keyof OnboardingData];
      return !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '');
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Strict mode: practitioner type must be explicitly selected and valid
    if (
      onboardingData.therapist_type !== 'clinic_based' &&
      onboardingData.therapist_type !== 'mobile' &&
      onboardingData.therapist_type !== 'hybrid'
    ) {
      throw new Error('Practitioner type is required. Please select clinic-based, mobile, or hybrid.');
    }
    
    // CRITICAL: Validate firstName and lastName are provided (not empty)
    // These are required for database NOT NULL constraints
    if (!onboardingData.firstName || !onboardingData.firstName.trim()) {
      throw new Error('First name is required and cannot be empty');
    }
    if (!onboardingData.lastName || !onboardingData.lastName.trim()) {
      throw new Error('Last name is required and cannot be empty');
    }
    
    // Additional validation for qualification file (OPTIONAL - warn but don't block)
    if (onboardingData.qualification_type && onboardingData.qualification_type !== 'none' && !onboardingData.qualification_file && !onboardingData.qualification_file_url) {
      console.warn('⚠️ No qualification certificate file provided - practitioner should upload later');
      // Don't throw error - allow onboarding to complete without file
    }

    // Handle qualification file upload if provided
    let qualificationFileUrl = null;
    if (onboardingData.qualification_file && onboardingData.qualification_type !== 'none') {
      try {
        // Upload file to Supabase Storage
        // Path should be {userId}/qualification_{timestamp}.{ext}
        // The bucket is already 'qualifications', so no prefix needed
        const fileExt = onboardingData.qualification_file.name.split('.').pop();
        const fileName = `qualification_${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('qualifications')
          .upload(filePath, onboardingData.qualification_file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          // Don't throw error - continue with other data
          console.warn('Qualification file upload failed, continuing with other data');
        } else {
          // Get public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from('qualifications')
            .getPublicUrl(filePath);
          
          qualificationFileUrl = urlData.publicUrl;
          console.log('Qualification file uploaded successfully:', qualificationFileUrl);
        }
      } catch (uploadError) {
        console.error('Error uploading qualification file:', uploadError);
        // Continue without throwing - don't block completion
        console.warn('Qualification file upload failed, continuing with other data');
      }
    }

    // Update user profile with all relevant fields - save everything to users table
    // NOTE: specializations and qualifications should NOT be saved as arrays to users table
    // They should be saved to practitioner_specializations junction table and qualifications table respectively
    
    // Helper function to safely get field value - returns null if empty/undefined
    const getFieldValue = (value: any) => {
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      return value;
    };
    
    const userUpdateData: any = {
      phone: getFieldValue(onboardingData.phone),
      onboarding_status: 'completed',
      profile_completed: true,
      treatment_exchange_enabled: true, // Automatically enable treatment exchange when profile is completed
      is_active: true, // Ensure practitioners are active for marketplace visibility
      average_rating: 0.00, // New practitioners start at 0 stars
      total_reviews: 0, // Start with 0 reviews
      updated_at: new Date().toISOString(),
    };
    
    // Add all practitioner fields directly to users table - only if they have values
    if (getFieldValue(onboardingData.bio)) {
      userUpdateData.bio = onboardingData.bio;
    }
    if (getFieldValue(onboardingData.location)) {
      userUpdateData.location = onboardingData.location;
      // Also save lat/long if provided
      if (onboardingData.latitude) userUpdateData.latitude = onboardingData.latitude;
      if (onboardingData.longitude) userUpdateData.longitude = onboardingData.longitude;
    }
    if (onboardingData.experience_years) {
      userUpdateData.experience_years = parseInt(onboardingData.experience_years || '0') || 0;
    }
    if (getFieldValue(onboardingData.professional_body)) {
      userUpdateData.professional_body = onboardingData.professional_body === 'other' 
        ? onboardingData.professional_body_other 
        : onboardingData.professional_body;
    }
    if (getFieldValue(onboardingData.registration_number)) {
      userUpdateData.registration_number = onboardingData.registration_number;
    }
    if (getFieldValue(onboardingData.qualification_type)) {
      userUpdateData.qualification_type = onboardingData.qualification_type === 'other' 
        ? onboardingData.qualification_other 
        : onboardingData.qualification_type;
    }
    if (onboardingData.qualification_expiry) {
      userUpdateData.qualification_expiry = onboardingData.qualification_expiry;
    }
    if (qualificationFileUrl) {
      userUpdateData.qualification_file_url = qualificationFileUrl;
    }
    if (onboardingData.response_time_hours) {
      userUpdateData.response_time_hours = parseInt(onboardingData.response_time_hours || '24') || 24;
    }
    // Always save services_offered (even if empty array - it's a valid value)
    // The field is jsonb NOT NULL with default '[]'::jsonb, so we should always include it
    if (onboardingData.services_offered !== undefined) {
      userUpdateData.services_offered = onboardingData.services_offered;
    }
    // Save liability insurance status
    if (onboardingData.has_liability_insurance !== undefined) {
      userUpdateData.has_liability_insurance = onboardingData.has_liability_insurance;
    }
    
    // Strict mode: persist only explicit therapist type (no inference/default fallback)
    userUpdateData.therapist_type = onboardingData.therapist_type;
    
    // Save clinic address (for clinic-based and hybrid)
    if (onboardingData.clinic_address) {
      userUpdateData.clinic_address = onboardingData.clinic_address;
      if (onboardingData.clinic_latitude !== null && onboardingData.clinic_latitude !== undefined) {
        userUpdateData.clinic_latitude = onboardingData.clinic_latitude;
      }
      if (onboardingData.clinic_longitude !== null && onboardingData.clinic_longitude !== undefined) {
        userUpdateData.clinic_longitude = onboardingData.clinic_longitude;
      }
      // Also set location to clinic address for backward compatibility
      if (!userUpdateData.location) {
        userUpdateData.location = onboardingData.clinic_address;
        if (onboardingData.clinic_latitude !== null && onboardingData.clinic_latitude !== undefined) {
          userUpdateData.latitude = onboardingData.clinic_latitude;
        }
        if (onboardingData.clinic_longitude !== null && onboardingData.clinic_longitude !== undefined) {
          userUpdateData.longitude = onboardingData.clinic_longitude;
        }
      }
    }
    
    // Save base address (for mobile and hybrid)
    if (onboardingData.base_address) {
      userUpdateData.base_address = onboardingData.base_address;
      if (onboardingData.base_latitude !== null && onboardingData.base_latitude !== undefined) {
        userUpdateData.base_latitude = onboardingData.base_latitude;
      }
      if (onboardingData.base_longitude !== null && onboardingData.base_longitude !== undefined) {
        userUpdateData.base_longitude = onboardingData.base_longitude;
      }
      // For mobile therapists, also set location to base address
      if (onboardingData.therapist_type === 'mobile' && !userUpdateData.location) {
        userUpdateData.location = onboardingData.base_address;
        if (onboardingData.base_latitude !== null && onboardingData.base_latitude !== undefined) {
          userUpdateData.latitude = onboardingData.base_latitude;
        }
        if (onboardingData.base_longitude !== null && onboardingData.base_longitude !== undefined) {
          userUpdateData.longitude = onboardingData.base_longitude;
        }
      }
    }

    // Save structured primary address fields when provided
    if (onboardingData.address_line1) {
      userUpdateData.address_line1 = onboardingData.address_line1;
    }
    if (onboardingData.address_line2 !== undefined) {
      userUpdateData.address_line2 = onboardingData.address_line2;
    }
    if (onboardingData.address_city) {
      userUpdateData.address_city = onboardingData.address_city;
    }
    if (onboardingData.address_county !== undefined) {
      userUpdateData.address_county = onboardingData.address_county;
    }
    if (onboardingData.address_postcode) {
      userUpdateData.address_postcode = onboardingData.address_postcode;
    }
    if (onboardingData.address_country) {
      userUpdateData.address_country = onboardingData.address_country;
    }
    
    // Save mobile service radius (for mobile and hybrid)
    if (onboardingData.mobile_service_radius_km !== null && onboardingData.mobile_service_radius_km !== undefined) {
      userUpdateData.mobile_service_radius_km = onboardingData.mobile_service_radius_km;
    }
    
    // NOTE: professional_statement and treatment_philosophy are saved to therapist_profiles table
    // (see code below after user update)
    
    console.log('📝 Saving practitioner onboarding data to users table:', {
      userId,
      fieldsToSave: Object.keys(userUpdateData),
      sampleData: {
        bio: userUpdateData.bio?.substring(0, 50),
        location: userUpdateData.location,
        experience_years: userUpdateData.experience_years,
        professional_body: userUpdateData.professional_body,
        registration_number: userUpdateData.registration_number,
        services_offered: userUpdateData.services_offered // Log services_offered to verify it's being saved
      },
      servicesOfferedDebug: {
        provided: onboardingData.services_offered,
        saved: userUpdateData.services_offered,
        type: typeof userUpdateData.services_offered,
        isArray: Array.isArray(userUpdateData.services_offered)
      }
    });

    // CRITICAL: Save firstName and lastName for practitioners
    // These are collected in step 1 of onboarding and MUST be persisted
    // first_name and last_name are NOT NULL in database, so we MUST provide values
    
    // Try to get from onboardingData first
    if (onboardingData.firstName !== undefined && onboardingData.firstName?.trim()) {
      userUpdateData.first_name = onboardingData.firstName.trim();
    } else if (onboardingData.firstName !== undefined && onboardingData.firstName === '') {
      // If explicitly passed as empty string, save it (but warn since it's required)
      console.warn('⚠️ firstName passed as empty string - this may cause issues since first_name is NOT NULL');
      userUpdateData.first_name = '';
    }
    
    if (onboardingData.lastName !== undefined && onboardingData.lastName?.trim()) {
      userUpdateData.last_name = onboardingData.lastName.trim();
    } else if (onboardingData.lastName !== undefined && onboardingData.lastName === '') {
      // If explicitly passed as empty string, save it (but warn since it's required)
      console.warn('⚠️ lastName passed as empty string - this may cause issues since last_name is NOT NULL');
      userUpdateData.last_name = '';
    }
    
    // CRITICAL: firstName and lastName should already be validated above
    // But double-check to prevent empty strings (which would violate NOT NULL constraint)
    if (!userUpdateData.first_name || userUpdateData.first_name.trim() === '') {
      console.error('❌ CRITICAL: firstName is empty after validation - this should never happen');
      throw new Error('First name cannot be empty. Please provide your first name.');
    }
    if (!userUpdateData.last_name || userUpdateData.last_name.trim() === '') {
      console.error('❌ CRITICAL: lastName is empty after validation - this should never happen');
      throw new Error('Last name cannot be empty. Please provide your last name.');
    }
    
    // Log what we're about to save for firstName/lastName
    console.log('📝 Name fields to save:', {
      first_name: userUpdateData.first_name || '(empty)',
      last_name: userUpdateData.last_name || '(empty)',
      source: onboardingData.firstName || onboardingData.lastName ? 'onboardingData' : 'fallback'
    });
    // services_offered already handled above (line ~186)

    // CRITICAL: Use retry mechanism for the main profile update
    // This ensures the onboarding_status: 'completed' actually persists
    const updateResult = await retryDatabaseOperation(
      async () => {
        const result = await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', userId)
          .select()
          .single();
        return result;
      },
      3,
      'practitioner profile update'
    );

    if (updateResult.error) {
      console.error('❌ User profile update error after retries:', updateResult.error);
      throw updateResult.error;
    }
    
    const updatedUser = updateResult.data;
    
    console.log('✅ Practitioner profile saved successfully:', {
      userId,
      savedFields: Object.keys(userUpdateData),
      verification: {
        bio: !!updatedUser?.bio,
        location: !!updatedUser?.location,
        experience_years: updatedUser?.experience_years,
        registration_number: !!updatedUser?.registration_number,
        professional_body: !!updatedUser?.professional_body,
        first_name: updatedUser?.first_name,
        last_name: updatedUser?.last_name
      }
    });
    
    // CRITICAL: Verify and ensure onboarding status was set to completed
    // This is the most important part - if it fails, onboarding is not complete
    if (updatedUser?.onboarding_status !== 'completed' || updatedUser?.profile_completed !== true) {
      console.warn('⚠️ Onboarding status not set correctly after update, attempting fix...');
      const statusResult = await ensureOnboardingStatusCompleted(userId);
      if (!statusResult.success) {
        console.error('❌ CRITICAL: Failed to ensure onboarding completion status');
        throw new Error('Failed to set onboarding status to completed. Please try again.');
      }
    } else {
      console.log('✅ Onboarding status verified as completed');
    }

    // Save specializations to practitioner_specializations junction table
    // NOTE: During onboarding, users select services_offered, which we need to map to specializations
    // If specializations array is provided directly, use it. Otherwise, map from services_offered.
    let specializationIds: string[] = [];
    
    if (onboardingData.specializations && onboardingData.specializations.length > 0) {
      // Specializations explicitly provided (e.g., from profile page)
      specializationIds = onboardingData.specializations;
    } else if (onboardingData.services_offered && onboardingData.services_offered.length > 0) {
      // Map services_offered → specializations based on practitioner role
      console.log('📋 Mapping services_offered to specializations...', onboardingData.services_offered);
      
      // Fetch all specializations from the database for this role category
      const { data: availableSpecs, error: specFetchError } = await supabase
        .from('specializations')
        .select('id, name, category')
        .eq('category', onboardingData.user_role || 'sports_therapist');
      
      if (specFetchError) {
        console.error('Error fetching specializations:', specFetchError);
      } else if (availableSpecs && availableSpecs.length > 0) {
        // Create comprehensive mapping from services_offered values to specialization names
        // This mapping is based on the actual specializations in the database
        const serviceToSpecializationMap: Record<string, string[]> = {
          // Massage Therapist mappings (category: massage_therapist)
          'sports_massage': ['Sports Massage'],
          'deep_tissue': ['Deep Tissue Massage'],
          'swedish_massage': ['Massage Therapy'],
          'trigger_point': ['Massage Therapy', 'Deep Tissue Massage'],
          'myofascial_release': ['Massage Therapy', 'Deep Tissue Massage'],
          'relaxation_massage': ['Massage Therapy'],
          'massage': ['Massage Therapy'],
          
          // Sports Therapist mappings (category: sports_therapist)
          'sports_injury_assessment': ['Sports Injury'],
          'exercise_rehabilitation': ['Rehabilitation'],
          'strength_conditioning': ['Strength Training'],
          'injury_prevention': ['Injury Prevention'],
          'performance_enhancement': ['Sports Injury', 'Strength Training'],
          'return_to_play': ['Rehabilitation', 'Sports Injury'],
          
          // Osteopath mappings (category: osteopath)
          'structural_osteopathy': ['Osteopathy', 'Manual Therapy'],
          'cranial_osteopathy': ['Cranial Osteopathy'],
          'visceral_osteopathy': ['Osteopathy'],
          'paediatric_osteopathy': ['Osteopathy'],
          'sports_osteopathy': ['Osteopathy'],
          'postural_assessment': ['Osteopathy', 'Manual Therapy'],
          
          // Common services - map to appropriate specializations based on role
          'mobilisation': ['Manual Therapy'], // For osteopath
          'manipulation': ['Manual Therapy'], // For osteopath
          'stretching': ['Rehabilitation'], // For sports_therapist
          'acupuncture': [], // No specialization mapping - service only
          'cupping': [] // No specialization mapping - service only
        };
        
        // Find matching specializations for each service
        const matchedSpecIds = new Set<string>();
        const unmatchedServices: string[] = [];
        
        onboardingData.services_offered.forEach((service: string) => {
          const mappedNames = serviceToSpecializationMap[service] || [];
          
          if (mappedNames.length > 0) {
            // Find specializations that match the mapped names exactly
            let foundMatch = false;
            mappedNames.forEach(mappedName => {
              const matchingSpec = availableSpecs.find(spec => 
                spec.name.toLowerCase() === mappedName.toLowerCase()
              );
              if (matchingSpec) {
                matchedSpecIds.add(matchingSpec.id);
                foundMatch = true;
              }
            });
            
            if (!foundMatch) {
              unmatchedServices.push(service);
            }
          } else {
            // For services without explicit mapping, try intelligent matching
            // Convert service value to readable name (e.g., "sports_massage" -> "Sports Massage")
            const serviceName = service.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            // Try exact match first
            let matchingSpec = availableSpecs.find(spec => 
              spec.name.toLowerCase() === serviceName.toLowerCase()
            );
            
            // If no exact match, try partial match
            if (!matchingSpec) {
              matchingSpec = availableSpecs.find(spec => {
                const specLower = spec.name.toLowerCase();
                const serviceLower = serviceName.toLowerCase();
                return specLower.includes(serviceLower) || serviceLower.includes(specLower);
              });
            }
            
            if (matchingSpec) {
              matchedSpecIds.add(matchingSpec.id);
            } else {
              unmatchedServices.push(service);
            }
          }
        });
        
        specializationIds = Array.from(matchedSpecIds);
        
        // Log results - no fallback, just report what was matched
        if (unmatchedServices.length > 0) {
          console.warn(`⚠️ Could not map ${unmatchedServices.length} service(s) to specializations:`, unmatchedServices);
        }
        
        if (specializationIds.length === 0) {
          console.warn('⚠️ No specializations matched from services_offered. User may need to manually add specializations.');
        } else {
          console.log(`✅ Mapped ${onboardingData.services_offered.length} services to ${specializationIds.length} specializations`);
        }
      }
    }
    
    if (specializationIds.length > 0) {
      // Delete existing specializations first
      await supabase
        .from('practitioner_specializations')
        .delete()
        .eq('practitioner_id', userId);
      
      // Insert new specializations
      const specInserts = specializationIds.map((specId: string) => ({
        practitioner_id: userId,
        specialization_id: specId
      }));
      
      const { error: specError } = await supabase
        .from('practitioner_specializations')
        .insert(specInserts);
      
      if (specError) {
        console.error('❌ Error saving specializations:', specError);
        // Don't throw - allow onboarding to complete even if specializations fail
        console.warn('Specialization save failed, but onboarding will continue');
      } else {
        console.log('✅ Specializations saved to junction table:', specializationIds);
      }
    } else {
      console.log('⚠️ No specializations to save (no services_offered or specializations provided)');
    }

    // Save qualifications to qualifications table
    // NOTE: During onboarding, users provide qualification_type, qualification_file, and qualification_expiry
    // which are saved to users table. We need to ALSO create an entry in the qualifications table.
    const qualsToInsert: any[] = [];
    
    // Case 1: Explicit qualifications array provided (e.g., from profile page)
    if (onboardingData.qualifications && Array.isArray(onboardingData.qualifications) && onboardingData.qualifications.length > 0) {
      onboardingData.qualifications.forEach((qual: any) => {
        // If it's an object, extract fields; if it's a string, treat as name
        if (typeof qual === 'object' && qual !== null) {
          qualsToInsert.push({
            practitioner_id: userId,
            name: qual.name || qual,
            institution: qual.institution || null,
            year_obtained: qual.year_obtained || null,
            certificate_url: qual.certificate_url || null,
            verified: qual.verified || false
          });
        } else {
          // Simple string - treat as qualification name
          qualsToInsert.push({
            practitioner_id: userId,
            name: qual,
            institution: null,
            year_obtained: null,
            certificate_url: null,
            verified: false
          });
        }
      });
    }
    
    // Case 2: Auto-map from qualification_type (primary qualification from onboarding)
    // If qualification_type is provided and not 'none', create a qualification entry
    // CRITICAL: Always create a qualification entry if qualification_type is provided, even if it's 'none'
    // This ensures the qualifications table has at least one entry for profile completion
    if (onboardingData.qualification_type) {
      console.log('📋 Auto-mapping primary qualification to qualifications table...', onboardingData.qualification_type);
      
      // Map qualification_type code to readable name
      const qualificationNames: Record<string, string> = {
        // Sports Therapist
        'itmmif': 'ITMMIF (Institute of Team & Musculoskeletal Medicine)',
        'atmmif': 'ATMMIF (Associate of the Institute of Team & Musculoskeletal Medicine)',
        // Massage Therapist
        'level_3_massage': 'Level 3 Massage Therapy Diploma',
        'level_4_massage': 'Level 4 Massage Therapy Diploma',
        'level_5_massage': 'Level 5 Massage Therapy Diploma',
        'itec_qualification': 'ITEC Qualification',
        'cnhc_registration': 'CNHC Registration',
        // Osteopath
        'bsc_osteopathy': 'BSc Osteopathy',
        'masters_osteopathy': 'Masters in Osteopathy',
        'gosc_registration': 'GOsC Registration',
        'boa_membership': 'BOA Membership',
        'io_membership': 'iO Membership',
        // Generic
        'professional_qualification': 'Professional Qualification',
        'equivalent': 'Equivalent Qualification',
        'other': onboardingData.qualification_other || 'Other Qualification'
      };
      
      // Skip if qualification_type is 'none' - don't create a qualification entry
      if (onboardingData.qualification_type === 'none') {
        console.log('⚠️ Qualification type is "none", skipping qualification entry creation');
      } else {
        const qualName = qualificationNames[onboardingData.qualification_type] || onboardingData.qualification_type;
        const expiryYear = onboardingData.qualification_expiry ? new Date(onboardingData.qualification_expiry).getFullYear() : null;
        
        // Only add if not already in the array (avoid duplicates)
        const alreadyExists = qualsToInsert.some(q => q.name === qualName);
        if (!alreadyExists) {
          qualsToInsert.push({
            practitioner_id: userId,
            name: qualName,
            institution: null, // Not collected during onboarding
            year_obtained: expiryYear, // Use expiry year as obtained year for now
            certificate_url: qualificationFileUrl || onboardingData.qualification_file_url || null, // Use the uploaded file URL
            verified: false // Needs manual verification
          });
          console.log(`✅ Auto-mapped primary qualification: ${qualName}`, {
            certificate_url: qualificationFileUrl || onboardingData.qualification_file_url || null
          });
        }
      }
    }
    
    // Insert all qualifications
    if (qualsToInsert.length > 0) {
      const { error: qualError } = await supabase
        .from('qualifications')
        .insert(qualsToInsert);
      
      if (qualError) {
        console.error('❌ Error saving qualifications:', qualError);
        // Don't throw - allow onboarding to complete even if qualifications fail
        console.warn('Qualification save failed, but onboarding will continue');
      } else {
        console.log(`✅ Qualifications saved to qualifications table: ${qualsToInsert.length} entries`);
      }
    } else {
      console.log('⚠️ No qualifications to save (no qualification_type or qualifications provided)');
    }

    // Create/update therapist_profiles record with professional_statement and treatment_philosophy
    // These fields are stored in therapist_profiles table, not users table
    if (onboardingData.professional_statement || onboardingData.treatment_philosophy) {
      const therapistProfileData: any = {
        user_id: userId,
      };
      
      if (onboardingData.professional_statement) {
        therapistProfileData.professional_statement = onboardingData.professional_statement;
      }
      if (onboardingData.treatment_philosophy) {
        therapistProfileData.treatment_philosophy = onboardingData.treatment_philosophy;
      }

      const { error: therapistProfileError } = await supabase
        .from('therapist_profiles')
        .upsert(therapistProfileData, {
          onConflict: 'user_id'
        });

      if (therapistProfileError) {
        console.error('Therapist profile creation/update error:', therapistProfileError);
        // Don't throw error - other data was saved successfully
        console.warn('Therapist profile creation/update failed, but other data was saved successfully');
      } else {
        console.log('✅ Therapist profile saved with professional_statement and treatment_philosophy');
      }
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

    // Create Stripe Connect account for practitioner
    try {
      // Get user data for Stripe Connect
      const { data: userData } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      const { data: connectData, error: connectError } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'create-connect-account',
          userId: userId,
          email: onboardingData.email || userData?.email || '',
          firstName: onboardingData.firstName || userData?.first_name || '',
          lastName: onboardingData.lastName || userData?.last_name || '',
          businessType: 'individual'
        }
      });

      if (connectError) {
        console.error('Stripe Connect creation error:', connectError);
        // Don't throw error - other data was saved successfully
        console.warn('Stripe Connect creation failed, but other data was saved successfully');
      } else if (connectData?.stripe_account_id) {
        // Account created successfully - embedded onboarding will be used (no hosted URL)
        console.log('Stripe Connect account created for embedded onboarding:', connectData.stripe_account_id);
      }
    } catch (error) {
      console.error('Stripe Connect creation error:', error);
      console.warn('Stripe Connect creation failed, but other data was saved successfully');
    }

    // Verify the data was saved correctly
    const verification = await verifyPractitionerOnboardingCompletion(userId);
    if (!verification.success) {
      console.warn('⚠️ Practitioner onboarding verification failed:', verification.issues);
    } else {
      console.log('✅ Practitioner onboarding verification passed!');
    }

    // Final summary log
    console.log('🎉 Practitioner onboarding completion summary:', {
      userId,
      timestamp: new Date().toISOString(),
      dataFlow: {
        onboardingProgressTable: 'Data collected and saved during steps',
        usersTable: 'Profile data transferred and saved',
        specializationsTable: `${onboardingData.specializations?.length || 0} specializations saved`,
        qualificationsTable: `${onboardingData.qualifications?.length || 0} qualifications saved`,
        availabilityTable: onboardingData.availability ? 'Working hours saved' : 'No availability data'
      },
      verificationResult: verification.success ? 'PASSED' : 'FAILED',
      issues: verification.issues
    });

    return { error: null };
  } catch (error) {
    console.error('❌ Error completing practitioner onboarding:', error);
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
    const requiredFields = ['firstName', 'lastName', 'phone'];
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

    // Skip client_profiles creation - this table is for marketplace session tracking
    // Not needed during initial onboarding as client_profiles are created automatically
    // when a client books their first session
    console.log('Skipping client_profiles creation - will be created on first booking');

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

    // Check user profile (practitioners also use the users table for core fields)
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
      if (!userProfile.location) issues.push('Missing location');
      if (userProfile.onboarding_status !== 'completed') issues.push('Onboarding not marked as completed');
    }

    // Note: Other fields like bio, experience_years, specializations, and qualifications
    // are now part of the post-onboarding profile setup and are not verified here.

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

    // Check client profile - skip for practitioners as client_profiles is marketplace-specific
    // This was causing errors for practitioners who don't have client_profiles entries

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
// Validation logic updated by AI
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
  } else {
    const practitionerData = data as OnboardingData;
    
    if (!practitionerData.phone?.trim()) {
      errors.push('Phone number is required');
    }
    if (!practitionerData.location?.trim()) {
      errors.push('Location is required');
    }
    // These fields are now handled in the profile setup phase, not during initial onboarding
    // but we still check if they exist to provide a better experience if they ARE provided.
    
    if (practitionerData.bio && practitionerData.bio.trim().length > 0 && practitionerData.bio.trim().length < 50) {
      errors.push('Bio must be at least 50 characters long');
    }
    
    // Qualification and professional body fields are now optional during initial onboarding
    if (practitionerData.qualification_type === 'other' && !practitionerData.qualification_other?.trim()) {
      errors.push('Please specify your qualification type');
    }
    
    // Specializations are optional - not required for validation
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Fallback check to fix practitioner onboarding status
 * This catches cases where a practitioner has paid for a subscription
 * but their onboarding status wasn't properly updated to 'completed'
 * 
 * Call this during login or auth callback for practitioners
 */
export async function checkAndFixPractitionerOnboardingStatus(userId: string): Promise<{
  wasFixed: boolean;
  previousStatus: string | null;
  error?: any;
}> {
  try {
    console.log('🔍 Checking practitioner onboarding status for potential fix...');
    
    // Get current user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('user_role, onboarding_status, profile_completed, phone, location')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
      return { wasFixed: false, previousStatus: null, error: profileError };
    }
    
    // Only check practitioners
    const isPractitioner = userProfile?.user_role && 
      ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
    
    if (!isPractitioner) {
      return { wasFixed: false, previousStatus: userProfile?.onboarding_status || null };
    }
    
    // If already completed, nothing to do
    if (userProfile.onboarding_status === 'completed' && userProfile.profile_completed === true) {
      console.log('✅ Practitioner onboarding already completed');
      return { wasFixed: false, previousStatus: 'completed' };
    }
    
    const previousStatus = userProfile.onboarding_status;
    
    // Check if practitioner has an active subscription (indicates they completed payment)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, status, plan_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();
    
    if (subError) {
      console.error('Error checking subscription:', subError);
      // Don't fail - just continue without fixing
      return { wasFixed: false, previousStatus, error: subError };
    }
    
    // Also check if they have Stripe Connect set up
    const { data: stripeConnect } = await supabase
      .from('stripe_connect_accounts')
      .select('id, stripe_account_id, charges_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Check if they have basic required profile data
    const hasBasicProfile = userProfile.phone && userProfile.location;
    
    // If they have subscription AND (Stripe Connect OR basic profile), they likely completed onboarding
    // but the status update failed
    const shouldFix = subscription && (stripeConnect?.charges_enabled || hasBasicProfile);
    
    if (shouldFix) {
      console.log('🔧 Detected incomplete onboarding status despite having subscription. Fixing...');
      console.log({
        previousStatus,
        hasSubscription: !!subscription,
        subscriptionStatus: subscription?.status,
        hasStripeConnect: !!stripeConnect?.charges_enabled,
        hasBasicProfile
      });
      
      // Use the robust status update function
      const fixResult = await ensureOnboardingStatusCompleted(userId);
      
      if (fixResult.success) {
        console.log('✅ Practitioner onboarding status automatically fixed!');
        return { wasFixed: true, previousStatus };
      } else {
        console.error('❌ Failed to fix onboarding status:', fixResult.error);
        return { wasFixed: false, previousStatus, error: fixResult.error };
      }
    }
    
    console.log('ℹ️ Practitioner onboarding not complete - user may still need to complete steps');
    return { wasFixed: false, previousStatus };
    
  } catch (error) {
    console.error('Exception in checkAndFixPractitionerOnboardingStatus:', error);
    return { wasFixed: false, previousStatus: null, error };
  }
}
