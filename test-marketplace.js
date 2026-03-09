/**
 * Test script to verify marketplace query works
 * Run this after applying the migration to check if practitioners appear
 */

import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMarketplaceQuery() {
  console.log('🧪 Testing marketplace query...\n');

  try {
    // This is the exact query from Marketplace.tsx
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        location,
        hourly_rate,
        specializations,
        services_offered,
        bio,
        experience_years,
        user_role,
        profile_completed,
        onboarding_status
      `)
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .eq('is_active', true)
      .eq('profile_completed', true)
      .eq('onboarding_status', 'completed')
      .not('hourly_rate', 'is', null);

    if (error) {
      console.error('❌ Marketplace query error:', error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} practitioners on marketplace`);
    
    if (data && data.length > 0) {
      console.log('\nPractitioners visible on marketplace:');
      data.forEach((practitioner, index) => {
        console.log(`\n${index + 1}. ${practitioner.first_name} ${practitioner.last_name}`);
        console.log(`   Role: ${practitioner.user_role}`);
        console.log(`   Location: ${practitioner.location}`);
        console.log(`   Hourly Rate: £${practitioner.hourly_rate}`);
        console.log(`   Specializations: ${practitioner.specializations?.join(', ') || 'None'}`);
        console.log(`   Bio: ${practitioner.bio ? 'Present' : 'Missing'}`);
      });
    } else {
      console.log('\n❌ No practitioners found on marketplace');
      console.log('This could mean:');
      console.log('- No practitioners have completed onboarding');
      console.log('- Missing required fields (is_active, profile_completed, etc.)');
      console.log('- Database migration not applied');
    }

  } catch (error) {
    console.error('❌ Test script error:', error);
  }
}

// Run the test
testMarketplaceQuery();

