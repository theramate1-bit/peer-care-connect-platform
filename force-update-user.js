// Force update user data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'bda9384a-7e7f-4bbe-86d7-d1ced213cf93';

async function forceUpdateUser() {
  console.log('🔧 Force updating user data...\n');

  try {
    // Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError);
      return;
    }

    console.log('Current user data:', currentUser);

    // Force update with explicit values
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        last_name: 'Doe',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }

    console.log('✅ User updated successfully');

    // Verify the update
    const { data: updatedUser, error: verifyError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log('✅ Verified update:', {
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      phone: updatedUser.phone
    });

  } catch (error) {
    console.error('❌ Force update error:', error);
  }
}

forceUpdateUser();
