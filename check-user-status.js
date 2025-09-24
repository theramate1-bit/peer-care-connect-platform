// Check current user status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'bda9384a-7e7f-4bbe-86d7-d1ced213cf93';

async function checkUserStatus() {
  console.log('🔍 Checking current user status...\n');

  try {
    // Check user profile
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return;
    }

    console.log('👤 User Profile Status:');
    console.log(`- First Name: ${user.first_name || 'MISSING'}`);
    console.log(`- Last Name: ${user.last_name || 'MISSING'}`);
    console.log(`- Phone: ${user.phone || 'MISSING'}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.user_role}`);
    console.log(`- Onboarding Status: ${user.onboarding_status}`);
    console.log(`- Profile Completed: ${user.profile_completed}`);

    // Check client profile
    const { data: clientProfile, error: clientError } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (clientError) {
      console.log('\n📋 Client Profile Status:');
      console.log(`- Status: ${clientError.code === 'PGRST116' ? 'NOT FOUND' : 'ERROR'}`);
      console.log(`- Error: ${clientError.message}`);
    } else {
      console.log('\n📋 Client Profile Status:');
      console.log(`- Status: FOUND`);
      console.log(`- Preferences: ${clientProfile.preferences ? 'Present' : 'Missing'}`);
    }

    // Overall assessment
    console.log('\n📊 Overall Assessment:');
    const issues = [];
    if (!user.first_name) issues.push('Missing first_name');
    if (!user.last_name) issues.push('Missing last_name');
    if (!user.phone) issues.push('Missing phone');
    if (!clientProfile) issues.push('Missing client profile');

    if (issues.length === 0) {
      console.log('✅ All data is complete!');
    } else {
      console.log(`⚠️ Issues found: ${issues.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

checkUserStatus();
