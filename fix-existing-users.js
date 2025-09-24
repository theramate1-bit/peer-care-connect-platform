// Fix script for existing users with incomplete onboarding data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixExistingUsers() {
  console.log('🔧 Fixing existing users with incomplete onboarding data...\n');

  try {
    // Step 1: Find all client users with incomplete data
    console.log('1. Finding users with incomplete data...');
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_role', 'client')
      .eq('onboarding_status', 'completed');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} client users`);

    // Step 2: Check which users need fixing
    const usersToFix = users.filter(user => 
      !user.last_name || 
      !user.location || 
      !user.avatar_preferences
    );

    console.log(`${usersToFix.length} users need fixing`);

    if (usersToFix.length === 0) {
      console.log('✅ All users already have complete data!');
      return;
    }

    // Step 3: Fix each user
    for (const user of usersToFix) {
      console.log(`\n🔧 Fixing user: ${user.email} (${user.id})`);
      
      // Update user profile with missing data
      const updates = {};
      if (!user.last_name) {
        updates.last_name = 'User'; // Default last name
        console.log('  - Adding default last name');
      }
      if (!user.location) {
        updates.location = 'London, UK'; // Default location
        console.log('  - Adding default location');
      }
      if (!user.avatar_preferences) {
        updates.avatar_preferences = {
          hairColor: 'brown',
          clothingColor: 'blue',
          accessories: [],
          backgroundColor: 'f0f0f0',
          skinColor: 'light',
          clothing: 'shirt',
          hairStyle: 'short',
          eyes: 'default',
          eyebrows: 'default',
          mouth: 'default',
          flip: false,
          rotate: 0,
          scale: 1
        };
        console.log('  - Adding default avatar preferences');
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Error updating user ${user.email}:`, updateError);
          continue;
        }
        console.log('  ✅ User profile updated');
      }

      // Check if client profile exists
      const { data: existingClientProfile } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!existingClientProfile) {
        console.log('  - Creating missing client profile');
        const { error: clientError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            preferences: {
              primary_goal: 'General Health & Wellness',
              preferred_therapy_types: ['Sports Therapy', 'Massage Therapy'],
              budget: '£50-100 per session',
              preferred_gender: 'No preference',
              preferred_location: 'Any location',
              preferred_time: 'Flexible',
              max_travel_distance: 10
            },
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

        if (clientError) {
          console.error(`❌ Error creating client profile for ${user.email}:`, clientError);
          continue;
        }
        console.log('  ✅ Client profile created');
      } else {
        console.log('  ✅ Client profile already exists');
      }
    }

    // Step 4: Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const { data: fixedUsers } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_role', 'client')
      .eq('onboarding_status', 'completed');

    const { data: clientProfiles } = await supabase
      .from('client_profiles')
      .select('*');

    console.log(`✅ Users with complete data: ${fixedUsers.length}`);
    console.log(`✅ Client profiles created: ${clientProfiles.length}`);

    // Check for any remaining issues
    const stillIncomplete = fixedUsers.filter(user => 
      !user.last_name || !user.location || !user.avatar_preferences
    );

    if (stillIncomplete.length === 0) {
      console.log('\n🎉 All users have been fixed successfully!');
      console.log('Users can now refresh their profile pages to see the updated data.');
    } else {
      console.log(`\n⚠️ ${stillIncomplete.length} users still have incomplete data`);
    }

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

fixExistingUsers();
