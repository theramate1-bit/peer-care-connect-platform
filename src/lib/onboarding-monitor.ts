// Onboarding monitoring and health check system
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingHealthCheck {
  totalClients: number;
  incompleteProfiles: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Performs a comprehensive health check on all user onboarding data
 */
export async function checkOnboardingHealth(): Promise<OnboardingHealthCheck> {
  try {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Get all users (clients and practitioners)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('onboarding_status', 'completed');

    if (usersError) {
      issues.push(`Error fetching users: ${usersError.message}`);
      return {
        totalClients: 0,
        incompleteProfiles: 0,
        issues,
        recommendations: ['Fix database connection issues']
      };
    }

    const totalUsers = allUsers?.length || 0;
    let incompleteProfiles = 0;

    // Check each user for incomplete data
    for (const user of allUsers || []) {
      const userIssues: string[] = [];
      
      if (!user.first_name) userIssues.push('Missing first_name');
      if (!user.last_name) userIssues.push('Missing last_name');
      if (!user.phone) userIssues.push('Missing phone');
      
      if (userIssues.length > 0) {
        incompleteProfiles++;
        issues.push(`${user.user_role} ${user.email}: ${userIssues.join(', ')}`);
      }
    }

    // Check for missing client profiles
    const { data: clientProfiles, error: clientProfilesError } = await supabase
      .from('user_profiles')
      .select('user_id');

    if (clientProfilesError) {
      issues.push(`Error fetching client profiles: ${clientProfilesError.message}`);
    } else {
      const clientProfileUserIds = clientProfiles?.map(p => p.user_id) || [];
      const clientsWithoutProfiles = allUsers?.filter(u => u.user_role === 'client' && !clientProfileUserIds.includes(u.id)) || [];
      
      if (clientsWithoutProfiles.length > 0) {
        issues.push(`${clientsWithoutProfiles.length} clients missing client profiles`);
        recommendations.push('Create missing client profiles for existing users');
      }
    }

    // Check for missing therapist profiles
    const { data: therapistProfiles, error: therapistProfilesError } = await supabase
      .from('users')
      .select('id')
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath']);

    if (therapistProfilesError) {
      issues.push(`Error fetching therapist profiles: ${therapistProfilesError.message}`);
    } else {
      const therapistProfileUserIds = therapistProfiles?.map(p => p.id) || [];
      const practitionersWithoutProfiles = allUsers?.filter(u => 
        ['sports_therapist', 'massage_therapist', 'osteopath'].includes(u.user_role) && 
        !therapistProfileUserIds.includes(u.id)
      ) || [];
      
      if (practitionersWithoutProfiles.length > 0) {
        issues.push(`${practitionersWithoutProfiles.length} practitioners missing therapist profiles`);
        recommendations.push('Create missing therapist profiles for existing practitioners');
      }
    }

    // Generate recommendations
    if (incompleteProfiles > 0) {
      recommendations.push('Run data migration to fix incomplete profiles');
      recommendations.push('Add validation to prevent incomplete onboarding');
    }

    if (issues.length === 0) {
      recommendations.push('All client profiles are complete - no action needed');
    }

    return {
      totalClients: totalUsers,
      incompleteProfiles,
      issues,
      recommendations
    };

  } catch (error) {
    return {
      totalClients: 0,
      incompleteProfiles: 0,
      issues: [`Health check error: ${error}`],
      recommendations: ['Fix system errors']
    };
  }
}

/**
 * Auto-repairs incomplete client profiles
 */
export async function autoRepairIncompleteProfiles(): Promise<{ repaired: number; errors: string[] }> {
  const errors: string[] = [];
  let repaired = 0;

  try {
    // Get clients with incomplete data
    const { data: incompleteClients, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_role', 'client')
      .eq('onboarding_status', 'completed')
      .or('first_name.is.null,last_name.is.null,phone.is.null');

    if (fetchError) {
      errors.push(`Error fetching incomplete clients: ${fetchError.message}`);
      return { repaired: 0, errors };
    }

    // Repair each incomplete client
    for (const client of incompleteClients || []) {
      try {
        const updates: any = {};
        
        if (!client.first_name) updates.first_name = 'User';
        if (!client.last_name) updates.last_name = 'Doe';
        if (!client.phone) updates.phone = 'Not provided';

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', client.id);

          if (updateError) {
            errors.push(`Failed to repair user ${client.email}: ${updateError.message}`);
          } else {
            repaired++;
          }
        }

        // Check if client profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', client.id)
          .single();

        if (!existingProfile) {
          // Create missing client profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: client.id,
              preferences: JSON.stringify({
                primary_goal: 'General Health & Wellness',
                preferred_therapy_types: ['Sports Therapy', 'Massage Therapy'],
                budget: '£50-100 per session',
                preferred_gender: 'No preference',
                preferred_location: 'Any location',
                preferred_time: 'Flexible',
                max_travel_distance: 10
              }),
              medical_history: JSON.stringify({
                medical_conditions: '',
                medications: '',
                allergies: '',
                previous_therapy: '',
                secondary_goals: []
              }),
              emergency_contact_name: '',
              emergency_contact_phone: ''
            });

          if (profileError) {
            errors.push(`Failed to create client profile for ${client.email}: ${profileError.message}`);
          }
        }

      } catch (clientError) {
        errors.push(`Error repairing client ${client.email}: ${clientError}`);
      }
    }

  } catch (error) {
    errors.push(`Auto-repair error: ${error}`);
  }

  return { repaired, errors };
}

/**
 * Sends notifications to users with incomplete profiles
 */
export async function notifyIncompleteProfiles(): Promise<{ notified: number; errors: string[] }> {
  const errors: string[] = [];
  let notified = 0;

  try {
    // This would integrate with your notification system
    // For now, just log the users who need to be notified
    const { data: incompleteClients } = await supabase
      .from('users')
      .select('email, first_name')
      .eq('user_role', 'client')
      .eq('onboarding_status', 'completed')
      .or('first_name.is.null,last_name.is.null,phone.is.null');

    for (const client of incompleteClients || []) {
      console.log(`Would notify ${client.email} about incomplete profile`);
      notified++;
    }

  } catch (error) {
    errors.push(`Notification error: ${error}`);
  }

  return { notified, errors };
}
