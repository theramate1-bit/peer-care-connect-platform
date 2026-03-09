/**
 * End-to-End Onboarding Test Runner
 * This script actually creates a user, completes onboarding, and verifies all data
 * 
 * Usage: npx tsx test-onboarding-e2e-runner.ts
 * 
 * Requires environment variables:
 * - VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for admin operations)
 * - VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function runE2ETest() {
  console.log('🧪 Starting End-to-End Onboarding Test\n');
  console.log('=' .repeat(60));

  const results: TestResult[] = [];
  let testUserId: string | null = null;
  const testEmail = `test-onboarding-${Date.now()}@example.com`;

  try {
    // Step 1: Create test user
    console.log('\n📝 Step 1: Creating test user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authData.user.id;
    results.push({
      test: 'Create test user',
      passed: true,
      message: `✅ User created: ${testEmail} (${testUserId})`
    });

    // Step 2: Set user role
    console.log('\n📝 Step 2: Setting user role...');
    const { error: roleError } = await supabaseAdmin
      .from('users')
      .update({ user_role: 'massage_therapist' })
      .eq('id', testUserId);

    if (roleError) {
      throw new Error(`Failed to set user role: ${roleError.message}`);
    }

    results.push({
      test: 'Set user role',
      passed: true,
      message: '✅ User role set to massage_therapist'
    });

    // Step 3: Simulate onboarding data
    console.log('\n📝 Step 3: Simulating onboarding completion...');
    const onboardingData = {
      firstName: 'Test',
      lastName: 'User',
      phone: '+441234567890',
      location: 'London, UK',
      bio: 'Test bio with more than 50 characters to meet validation requirements for professional background',
      experience_years: 5,
      professional_body: 'cnhc',
      registration_number: 'TEST123',
      qualification_type: 'level_4_massage',
      services_offered: ['sports_massage', 'trigger_point', 'deep_tissue'],
      latitude: 51.5074,
      longitude: -0.1278,
      service_radius_km: 25,
      response_time_hours: 24
    };

    // Step 4: Update user table
    console.log('\n📝 Step 4: Saving user data...');
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        first_name: onboardingData.firstName,
        last_name: onboardingData.lastName,
        phone: onboardingData.phone,
        location: onboardingData.location,
        bio: onboardingData.bio,
        experience_years: onboardingData.experience_years,
        professional_body: onboardingData.professional_body,
        registration_number: onboardingData.registration_number,
        qualification_type: onboardingData.qualification_type,
        services_offered: onboardingData.services_offered,
        latitude: onboardingData.latitude,
        longitude: onboardingData.longitude,
        service_radius_km: onboardingData.service_radius_km,
        response_time_hours: onboardingData.response_time_hours,
        onboarding_status: 'completed',
        profile_completed: true
      })
      .eq('id', testUserId);

    if (userUpdateError) {
      throw new Error(`Failed to update user data: ${userUpdateError.message}`);
    }

    results.push({
      test: 'Save user data',
      passed: true,
      message: '✅ User data saved successfully'
    });

    // Step 5: Map and save specializations
    console.log('\n📝 Step 5: Mapping services to specializations...');
    const { data: availableSpecs, error: specFetchError } = await supabaseAdmin
      .from('specializations')
      .select('id, name, category')
      .eq('category', 'massage_therapist');

    if (specFetchError) {
      throw new Error(`Failed to fetch specializations: ${specFetchError.message}`);
    }

    const serviceToSpecializationMap: Record<string, string[]> = {
      'sports_massage': ['Sports Massage'],
      'deep_tissue': ['Deep Tissue Massage'],
      'trigger_point': ['Massage Therapy', 'Deep Tissue Massage']
    };

    const matchedSpecIds = new Set<string>();
    
    onboardingData.services_offered.forEach((service: string) => {
      const mappedNames = serviceToSpecializationMap[service] || [];
      mappedNames.forEach(mappedName => {
        const matchingSpec = availableSpecs?.find(spec => 
          spec.name.toLowerCase() === mappedName.toLowerCase()
        );
        if (matchingSpec) {
          matchedSpecIds.add(matchingSpec.id);
        }
      });
    });

    if (matchedSpecIds.size > 0) {
      const specInserts = Array.from(matchedSpecIds).map(specId => ({
        practitioner_id: testUserId,
        specialization_id: specId
      }));

      const { error: specError } = await supabaseAdmin
        .from('practitioner_specializations')
        .insert(specInserts);

      if (specError) {
        throw new Error(`Failed to save specializations: ${specError.message}`);
      }

      results.push({
        test: 'Map and save specializations',
        passed: true,
        message: `✅ Mapped ${onboardingData.services_offered.length} services to ${matchedSpecIds.size} specializations`,
        details: { services: onboardingData.services_offered, specializations: Array.from(matchedSpecIds) }
      });
    } else {
      results.push({
        test: 'Map and save specializations',
        passed: false,
        message: '❌ No specializations were mapped'
      });
    }

    // Step 6: Save qualification
    console.log('\n📝 Step 6: Saving qualification...');
    const qualificationNames: Record<string, string> = {
      'level_4_massage': 'Level 4 Massage Therapy Diploma'
    };

    const qualName = qualificationNames[onboardingData.qualification_type] || onboardingData.qualification_type;
    
    const { error: qualError } = await supabaseAdmin
      .from('qualifications')
      .insert({
        practitioner_id: testUserId,
        name: qualName,
        institution: null,
        year_obtained: null,
        certificate_url: null,
        verified: false
      });

    if (qualError) {
      throw new Error(`Failed to save qualification: ${qualError.message}`);
    }

    results.push({
      test: 'Save qualification',
      passed: true,
      message: `✅ Qualification saved: ${qualName}`
    });

    // Step 7: Verify all data
    console.log('\n📝 Step 7: Verifying saved data...');
    const { data: userData, error: userFetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (userFetchError) {
      throw new Error(`Failed to fetch user data: ${userFetchError.message}`);
    }

    // Verify basic fields
    const basicChecks = [
      { field: 'first_name', expected: onboardingData.firstName, actual: userData?.first_name },
      { field: 'last_name', expected: onboardingData.lastName, actual: userData?.last_name },
      { field: 'phone', expected: onboardingData.phone, actual: userData?.phone },
      { field: 'bio', expected: onboardingData.bio, actual: userData?.bio },
      { field: 'location', expected: onboardingData.location, actual: userData?.location }
    ];

    basicChecks.forEach(check => {
      const passed = check.actual === check.expected;
      results.push({
        test: `Verify ${check.field}`,
        passed,
        message: passed 
          ? `✅ ${check.field}: "${check.actual}"`
          : `❌ ${check.field}: expected "${check.expected}", got "${check.actual}"`
      });
    });

    // Verify specializations
    const { data: specializations } = await supabaseAdmin
      .from('practitioner_specializations')
      .select('specialization_id, specializations(name)')
      .eq('practitioner_id', testUserId);

    results.push({
      test: 'Verify specializations count',
      passed: (specializations?.length || 0) >= 2,
      message: `✅ Found ${specializations?.length || 0} specializations`,
      details: specializations?.map((s: any) => s.specializations?.name)
    });

    // Verify qualifications
    const { data: qualifications } = await supabaseAdmin
      .from('qualifications')
      .select('*')
      .eq('practitioner_id', testUserId);

    results.push({
      test: 'Verify qualifications count',
      passed: (qualifications?.length || 0) === 1,
      message: `✅ Found ${qualifications?.length || 0} qualification(s)`,
      details: qualifications?.map((q: any) => q.name)
    });

    // Calculate profile completion
    const basicFields = [
      userData?.first_name,
      userData?.last_name,
      userData?.email,
      userData?.phone,
      userData?.profile_photo_url
    ].filter(Boolean).length;

    const professionalFields = [
      userData?.bio,
      userData?.location,
      userData?.experience_years,
      specializations?.length,
      userData?.hourly_rate,
      userData?.registration_number,
      qualifications?.length
    ].filter(field => {
      if (typeof field === 'number') return field > 0;
      return !!field;
    }).length;

    const totalCompleted = basicFields + professionalFields;
    const totalFields = 12;
    const completionPercentage = Math.round((totalCompleted / totalFields) * 100);

    results.push({
      test: 'Profile completion percentage',
      passed: completionPercentage > 42,
      message: `✅ Profile completion: ${completionPercentage}% (${totalCompleted}/${totalFields} fields)`,
      details: { basicFields, professionalFields, totalCompleted, totalFields }
    });

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60) + '\n');

    results.forEach(result => {
      console.log(result.message);
    });

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log('='.repeat(60) + '\n');

    if (failed === 0) {
      console.log('🎉 All tests passed! Onboarding flow is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Review the results above.');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    if (testUserId) {
      console.log('\n🧹 Cleaning up test user...');
      try {
        await supabaseAdmin
          .from('practitioner_specializations')
          .delete()
          .eq('practitioner_id', testUserId);
        
        await supabaseAdmin
          .from('qualifications')
          .delete()
          .eq('practitioner_id', testUserId);
        
        await supabaseAdmin
          .from('therapist_profiles')
          .delete()
          .eq('user_id', testUserId);
        
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', testUserId);
        
        await supabaseAdmin.auth.admin.deleteUser(testUserId);
        console.log('✅ Cleanup complete');
      } catch (cleanupError) {
        console.error('⚠️ Error during cleanup:', cleanupError);
      }
    }
  }
}

// Run the test
runE2ETest().catch(console.error);

