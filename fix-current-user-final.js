// Final fix for current user with proper error handling
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'bda9384a-7e7f-4bbe-86d7-d1ced213cf93';

async function fixCurrentUser() {
  console.log('🔧 Fixing current user data...\n');

  try {
    // Step 1: Update user profile with last_name
    console.log('1. Updating user profile...');
    const { error: userUpdateError } = await supabase
      .from('user_profiles')
      .update({
        last_name: 'Doe' // Update with actual last name
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('❌ Error updating user profile:', userUpdateError);
      return;
    }
    console.log('✅ User profile updated successfully');

    // Step 2: Try to create client profile with minimal data
    console.log('\n2. Creating client profile...');
    
    // First, let's try a simple insert to see what columns are required
    const { error: clientCreateError } = await supabase
      .from('client_profiles')
      .insert({
        user_id: userId,
        preferences: JSON.stringify({
          primary_goal: 'Pain Relief',
          preferred_therapy_types: ['Sports Therapy', 'Massage Therapy', 'Osteopathy', 'Physiotherapy']
        })
      });

    if (clientCreateError) {
      console.error('❌ Error creating client profile:', clientCreateError);
      
      // If the table doesn't exist or has different schema, let's check
      console.log('\n🔍 Checking if client_profiles table exists...');
      const { data: testData, error: testError } = await supabase
        .from('client_profiles')
        .select('*')
        .limit(1);
        
      if (testError) {
        console.log('❌ Client profiles table error:', testError.message);
        console.log('💡 The client_profiles table may not exist or have different schema');
      } else {
        console.log('✅ Client profiles table exists but is empty');
      }
      
      return;
    }
    
    console.log('✅ Client profile created successfully');

    // Step 3: Verify the fix
    console.log('\n3. Verifying the fix...');
    const { data: updatedUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: newClientProfile } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('✅ Updated user profile:', {
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      phone: updatedUser.phone,
      onboarding_status: updatedUser.onboarding_status
    });

    if (newClientProfile) {
      console.log('✅ New client profile:', {
        preferences: newClientProfile.preferences
      });
    }

    console.log('\n🎉 User data fixed successfully!');
    console.log('You can now refresh your profile page to see the updated data.');

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

fixCurrentUser();
