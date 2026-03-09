/**
 * Debug script to check why therapists aren't appearing on marketplace
 */

import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMarketplace() {
  console.log('🔍 Debugging marketplace visibility...\n');

  try {
    // 1. Check all practitioners regardless of status
    console.log('1. All practitioners in database:');
    const { data: allPractitioners, error: allError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        user_role,
        is_active,
        profile_completed,
        onboarding_status,
        hourly_rate,
        bio,
        location,
        specializations
      `)
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist']);

    if (allError) {
      console.error('❌ Error fetching all practitioners:', allError);
      return;
    }

    console.log(`Found ${allPractitioners?.length || 0} practitioners total`);
    
    if (allPractitioners && allPractitioners.length > 0) {
      allPractitioners.forEach((p, index) => {
        console.log(`\nPractitioner ${index + 1}:`);
        console.log(`  Name: ${p.first_name} ${p.last_name}`);
        console.log(`  Role: ${p.user_role}`);
        console.log(`  Active: ${p.is_active}`);
        console.log(`  Profile Completed: ${p.profile_completed}`);
        console.log(`  Onboarding Status: ${p.onboarding_status}`);
        console.log(`  Hourly Rate: ${p.hourly_rate}`);
        console.log(`  Has Bio: ${!!p.bio}`);
        console.log(`  Has Location: ${!!p.location}`);
        console.log(`  Specializations: ${p.specializations?.length || 0}`);
      });
    }

    // 2. Check marketplace query specifically
    console.log('\n\n2. Practitioners that would appear on marketplace:');
    const { data: marketplacePractitioners, error: marketplaceError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        user_role,
        is_active,
        profile_completed,
        onboarding_status,
        hourly_rate
      `)
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .eq('is_active', true)
      .eq('profile_completed', true)
      .eq('onboarding_status', 'completed')
      .not('hourly_rate', 'is', null);

    if (marketplaceError) {
      console.error('❌ Error fetching marketplace practitioners:', marketplaceError);
      return;
    }

    console.log(`Found ${marketplacePractitioners?.length || 0} practitioners that would appear on marketplace`);

    // 3. Check each filter individually
    console.log('\n\n3. Individual filter analysis:');
    
    const { data: activePractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .eq('is_active', true);
    console.log(`✅ Active practitioners: ${activePractitioners?.length || 0}`);

    const { data: profileCompletedPractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .eq('profile_completed', true);
    console.log(`✅ Profile completed practitioners: ${profileCompletedPractitioners?.length || 0}`);

    const { data: onboardingCompletedPractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .eq('onboarding_status', 'completed');
    console.log(`✅ Onboarding completed practitioners: ${onboardingCompletedPractitioners?.length || 0}`);

    const { data: hourlyRatePractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name, hourly_rate')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .not('hourly_rate', 'is', null);
    console.log(`✅ Practitioners with hourly rate: ${hourlyRatePractitioners?.length || 0}`);

    // 4. Check for common issues
    console.log('\n\n4. Common issues found:');
    
    const { data: inactivePractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .eq('is_active', false);
    if (inactivePractitioners?.length > 0) {
      console.log(`❌ ${inactivePractitioners.length} practitioners are inactive`);
    }

    const { data: incompleteProfilePractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .eq('profile_completed', false);
    if (incompleteProfilePractitioners?.length > 0) {
      console.log(`❌ ${incompleteProfilePractitioners.length} practitioners have incomplete profiles`);
    }

    const { data: incompleteOnboardingPractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name, onboarding_status')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .neq('onboarding_status', 'completed');
    if (incompleteOnboardingPractitioners?.length > 0) {
      console.log(`❌ ${incompleteOnboardingPractitioners.length} practitioners have incomplete onboarding`);
      incompleteOnboardingPractitioners.forEach(p => {
        console.log(`   - ${p.first_name} ${p.last_name}: ${p.onboarding_status}`);
      });
    }

    const { data: noHourlyRatePractitioners } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
      .is('hourly_rate', null);
    if (noHourlyRatePractitioners?.length > 0) {
      console.log(`❌ ${noHourlyRatePractitioners.length} practitioners have no hourly rate`);
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug function
debugMarketplace();

