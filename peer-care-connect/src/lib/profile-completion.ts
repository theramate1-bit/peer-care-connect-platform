/**
 * Profile Completion Calculation Utility
 * 
 * Standardized calculation for profile completion percentage across all components.
 * Ensures consistent percentage display throughout the application.
 */

export interface ProfileCompletionData {
  // Basic personal fields
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_photo_url?: string | null;
  
  // Professional fields
  bio?: string | null;
  location?: string | null;
  experience_years?: number | null;
  registration_number?: string | null;
  
  // Array fields (will be passed separately as they come from different tables)
  specializationsCount?: number; // Count from practitioner_specializations junction table
  qualificationsCount?: number; // Count from qualifications table
}

export interface ProfileCompletionResult {
  percentage: number;
  completed: number;
  total: number;
  breakdown: {
    basic: { completed: number; total: number };
    professional: { completed: number; total: number };
  };
}

/**
 * Calculate profile completion percentage for a practitioner
 * 
 * Fields counted:
 * - Basic (5): firstName, lastName, email, phone, photo
 * - Professional (5): bio, location, experience_years, registration_number, qualifications
 * - Total: 11 fields
 * Note: Specializations are optional and not counted in completion percentage
 * 
 * @param profile - User profile data from database
 * @param specializationsCount - Number of specializations from practitioner_specializations table (optional, not counted)
 * @param qualificationsCount - Number of qualifications from qualifications table
 * @returns ProfileCompletionResult with percentage and breakdown
 */
export function calculateProfileCompletion(
  profile: ProfileCompletionData | null | undefined,
  specializationsCount: number = 0,
  qualificationsCount: number = 0
): ProfileCompletionResult {
  if (!profile) {
    return {
      percentage: 0,
      completed: 0,
      total: 11,
      breakdown: {
        basic: { completed: 0, total: 5 },
        professional: { completed: 0, total: 6 }
      }
    };
  }

  let completed = 0;
  let basicCompleted = 0;
  let professionalCompleted = 0;

  // Basic personal fields (5 total)
  const basicTotal = 5;
  
  if (profile.first_name?.trim()) basicCompleted++;
  if (profile.last_name?.trim()) basicCompleted++;
  if (profile.email?.trim()) basicCompleted++;
  if (profile.phone?.trim()) basicCompleted++;
  if (profile.profile_photo_url) basicCompleted++;

  // Professional fields (5 total) - specializations are optional and not counted
  const professionalTotal = 5;
  
  if (profile.bio?.trim()) professionalCompleted++;
  if (profile.location?.trim()) professionalCompleted++;
  if (profile.experience_years && profile.experience_years > 0) professionalCompleted++;
  // Specializations are optional - not counted in completion
  if (profile.registration_number?.trim()) professionalCompleted++;
  if (qualificationsCount > 0) professionalCompleted++;

  completed = basicCompleted + professionalCompleted;
  const total = basicTotal + professionalTotal;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    percentage,
    completed,
    total,
    breakdown: {
      basic: { completed: basicCompleted, total: basicTotal },
      professional: { completed: professionalCompleted, total: professionalTotal }
    }
  };
}

/**
 * Simplified version that accepts a profile object and fetches counts internally
 * Use this when you have access to the full profile but need to fetch specializations/qualifications
 */
export async function calculateProfileCompletionAsync(
  profile: any,
  userId: string,
  supabaseClient: any
): Promise<ProfileCompletionResult> {
  if (!profile || !userId) {
    return calculateProfileCompletion(null);
  }

  // Fetch specializations count
  const { count: specializationsCount } = await supabaseClient
    .from('practitioner_specializations')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', userId);

  // Fetch qualifications count
  const { count: qualificationsCount } = await supabaseClient
    .from('qualifications')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', userId);

  return calculateProfileCompletion(
    profile,
    specializationsCount || 0,
    qualificationsCount || 0
  );
}

/**
 * Profile Activation Status Interface
 * 
 * Represents the official 5-check methodology for "activating profile and starting accepting bookings"
 */
export interface ProfileActivationCheck {
  id: string;
  label: string;
  isComplete: boolean;
}

export interface ProfileActivationStatus {
  percentage: number;
  completed: number;
  total: number;
  checks: ProfileActivationCheck[];
}

/**
 * Calculate profile activation status using the official 6-check methodology
 * 
 * This is the official calculation for "activating profile and starting accepting bookings".
 * Used consistently across ProfileCompletionWidget and Profile page sidebar.
 * 
 * Checks:
 * 1. Professional Bio (bio exists and is not empty)
 * 2. Years of Experience (experience_years exists)
 * 3. Qualifications (has at least one qualification record in qualifications table)
 *    and at least one uploaded qualification document
 * 4. Availability Schedule (has availability with at least one enabled day with valid hours)
 * 5. Service Location (location exists)
 * 6. Services & Pricing (has at least one active product in practitioner_products table)
 * 
 * @param userProfile - User profile data from database
 * @param hasAvailability - Whether the user has availability set up (boolean | null)
 * @param qualificationsCount - Number of qualifications from qualifications table (optional, defaults to 0)
 * @param productsCount - Number of active products from practitioner_products table (optional, defaults to 0)
 * @param qualificationDocumentsCount - Number of uploaded qualification documents (optional, defaults to 0)
 * @returns ProfileActivationStatus with percentage, counts, and individual check statuses
 */
export function calculateProfileActivationStatus(
  userProfile: any,
  hasAvailability: boolean | null,
  qualificationsCount: number = 0,
  productsCount: number = 0,
  qualificationDocumentsCount: number = 0
): ProfileActivationStatus {
  if (!userProfile) {
    return {
      percentage: 0,
      completed: 0,
      total: 6,
      checks: [
        {
          id: 'bio',
          label: 'Professional Bio',
          isComplete: false
        },
        {
          id: 'experience',
          label: 'Years of Experience',
          isComplete: false
        },
        {
          id: 'qualifications',
          label: 'Qualifications & Document',
          isComplete: false
        },
        {
          id: 'availability',
          label: 'Availability Schedule',
          isComplete: false
        },
        {
          id: 'location',
          label: 'Service Location',
          isComplete: false
        },
        {
          id: 'services',
          label: 'Services & Pricing',
          isComplete: false
        }
      ]
    };
  }

  const checks: ProfileActivationCheck[] = [
    {
      id: 'bio',
      label: 'Professional Bio',
      isComplete: !!userProfile.bio && userProfile.bio.trim().length > 0
    },
    {
      id: 'experience',
      label: 'Years of Experience',
      isComplete: !!userProfile.experience_years
    },
    {
      id: 'qualifications',
      label: 'Qualifications & Document',
      isComplete: qualificationsCount > 0 && qualificationDocumentsCount > 0
    },
    {
      id: 'availability',
      label: 'Availability Schedule',
      isComplete: hasAvailability === true
    },
    {
      id: 'location',
      label: 'Service Location',
      isComplete: !!userProfile.location
    },
    {
      id: 'services',
      label: 'Services & Pricing',
      isComplete: productsCount > 0
    }
  ];

  const completed = checks.filter(c => c.isComplete).length;
  const total = checks.length;
  const percentage = Math.round((completed / total) * 100);

  return {
    percentage,
    completed,
    total,
    checks
  };
}

/**
 * Check if practitioner availability has at least one enabled day with valid hours
 * This is a shared utility function to ensure consistent availability checking across all components
 * 
 * @param workingHours - The working_hours object from practitioner_availability table
 * @returns boolean - true if at least one day is enabled with valid hours
 */
export function hasValidAvailability(workingHours: any): boolean {
  if (!workingHours || typeof workingHours !== 'object') {
    return false;
  }

  return Object.values(workingHours).some(
    (day: any) => {
      // Day must exist, be an object, and be enabled
      if (!day || typeof day !== 'object' || day.enabled !== true) {
        return false;
      }

      // Check for new structure with hours array
      if (day.hours && Array.isArray(day.hours) && day.hours.length > 0) {
        // Validate that hours array has valid entries with non-empty start/end
        return day.hours.some((hourBlock: any) => 
          hourBlock && 
          typeof hourBlock === 'object' &&
          hourBlock.start && 
          hourBlock.end && 
          typeof hourBlock.start === 'string' &&
          typeof hourBlock.end === 'string' &&
          hourBlock.start.trim() !== '' && 
          hourBlock.end.trim() !== ''
        );
      }

      // Check for old structure with start/end directly
      if (day.start && day.end) {
        // Ensure start and end are non-empty strings
        return typeof day.start === 'string' && 
               typeof day.end === 'string' &&
               day.start.trim() !== '' && 
               day.end.trim() !== '';
      }

      return false;
    }
  );
}
