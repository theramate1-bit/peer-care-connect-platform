// Debug script to check client data in database
import { createClient } from '@supabase/supabase-js';

// Supabase credentials from the project
const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugClientData() {
  try {
    console.log('🔍 Debugging client data...\n');

    // Get all user profiles
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_role', 'client');

    if (userError) {
      console.error('❌ Error fetching user profiles:', userError);
      return;
    }

    console.log('👥 User Profiles (Clients):');
    userProfiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. User ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   First Name: ${profile.first_name}`);
      console.log(`   Last Name: ${profile.last_name}`);
      console.log(`   Phone: ${profile.phone}`);
      console.log(`   Location: ${profile.location}`);
      console.log(`   Onboarding Status: ${profile.onboarding_status}`);
      console.log(`   Profile Completed: ${profile.profile_completed}`);
      console.log(`   Avatar Preferences: ${JSON.stringify(profile.avatar_preferences)}`);
    });

    // Get all client profiles
    const { data: clientProfiles, error: clientError } = await supabase
      .from('client_profiles')
      .select('*');

    if (clientError) {
      console.error('❌ Error fetching client profiles:', clientError);
      return;
    }

    console.log('\n🏥 Client Profiles:');
    clientProfiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. User ID: ${profile.user_id}`);
      console.log(`   Preferences: ${JSON.stringify(profile.preferences)}`);
      console.log(`   Medical History: ${JSON.stringify(profile.medical_history)}`);
      console.log(`   Emergency Contact: ${JSON.stringify(profile.emergency_contact_name)}`);
    });

    // Check for specific user (replace with actual user ID)
    const testUserId = userProfiles[0]?.id;
    if (testUserId) {
      console.log(`\n🔍 Detailed check for user ${testUserId}:`);
      
      // Try to get user profile without .single() to avoid coercion error
      const { data: userProfilesDetail, error: userDetailError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', testUserId);

      if (userDetailError) {
        console.error('❌ Error fetching user detail:', userDetailError);
      } else {
        console.log('✅ User Profile Detail:', userProfilesDetail);
        if (userProfilesDetail && userProfilesDetail.length > 0) {
          console.log('📋 First user profile:', userProfilesDetail[0]);
        }
      }

      // Try to get client profile without .single()
      const { data: clientProfilesDetail, error: clientDetailError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', testUserId);

      if (clientDetailError) {
        console.error('❌ Error fetching client detail:', clientDetailError);
      } else {
        console.log('✅ Client Profile Detail:', clientProfilesDetail);
        if (clientProfilesDetail && clientProfilesDetail.length > 0) {
          console.log('📋 First client profile:', clientProfilesDetail[0]);
        } else {
          console.log('⚠️ No client profile found for this user');
        }
      }

      // Check if there are any client profiles at all
      const { data: allClientProfiles, error: allClientError } = await supabase
        .from('client_profiles')
        .select('*');

      if (allClientError) {
        console.error('❌ Error fetching all client profiles:', allClientError);
      } else {
        console.log(`\n📊 Total client profiles in database: ${allClientProfiles.length}`);
        if (allClientProfiles.length > 0) {
          console.log('📋 All client profiles:', allClientProfiles);
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugClientData();
