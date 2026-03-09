/**
 * End-to-End Test Script for Onboarding Data Persistence
 * 
 * This script verifies that all data collected during onboarding is properly saved to the database.
 * Run this after completing onboarding to verify data integrity.
 * 
 * Usage:
 * 1. Complete onboarding as a practitioner
 * 2. Get your user ID from the database or browser console
 * 3. Update the USER_ID constant below
 * 4. Run: npx tsx test-onboarding-e2e.ts
 */

import { createClient } from '@supabase/supabase-js';

// Get these from your .env file or Supabase dashboard
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Update this with the user ID you want to test
const USER_ID = '2aa80f40-9e3d-46ce-b88d-d0f9b61d5069'; // Example: massage therapist user

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  field: string;
  expected: any;
  actual: any;
  passed: boolean;
  message: string;
}

async function testOnboardingDataPersistence() {
  console.log('🧪 Starting End-to-End Onboarding Data Persistence Test\n');
  console.log(`Testing user ID: ${USER_ID}\n`);

  const results: TestResult[] = [];

  // Test 1: Basic Personal Information
  console.log('📋 Testing Basic Personal Information...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('first_name, last_name, email, phone, profile_photo_url')
    .eq('id', USER_ID)
    .single();

  if (userError) {
    console.error('❌ Error fetching user data:', userError);
    return;
  }

  // Test first_name
  results.push({
    field: 'first_name',
    expected: 'Non-empty string',
    actual: userData.first_name,
    passed: !!userData.first_name?.trim(),
    message: userData.first_name?.trim() 
      ? `✅ first_name is set: "${userData.first_name}"`
      : `❌ first_name is empty or missing`
  });

  // Test last_name
  results.push({
    field: 'last_name',
    expected: 'Non-empty string',
    actual: userData.last_name,
    passed: !!userData.last_name?.trim(),
    message: userData.last_name?.trim()
      ? `✅ last_name is set: "${userData.last_name}"`
      : `❌ last_name is empty or missing`
  });

  // Test email
  results.push({
    field: 'email',
    expected: 'Valid email',
    actual: userData.email,
    passed: !!userData.email?.trim(),
    message: userData.email?.trim()
      ? `✅ email is set: "${userData.email}"`
      : `❌ email is missing`
  });

  // Test phone
  results.push({
    field: 'phone',
    expected: 'Phone number',
    actual: userData.phone,
    passed: !!userData.phone?.trim(),
    message: userData.phone?.trim()
      ? `✅ phone is set: "${userData.phone}"`
      : `❌ phone is missing`
  });

  // Test profile_photo_url
  results.push({
    field: 'profile_photo_url',
    expected: 'URL string',
    actual: userData.profile_photo_url,
    passed: !!userData.profile_photo_url,
    message: userData.profile_photo_url
      ? `✅ profile_photo_url is set`
      : `❌ profile_photo_url is missing`
  });

  // Test 2: Professional Information
  console.log('📋 Testing Professional Information...');
  const { data: professionalData, error: professionalError } = await supabase
    .from('users')
    .select('bio, location, experience_years, hourly_rate, registration_number, professional_body, qualification_type, services_offered, latitude, longitude, service_radius_km')
    .eq('id', USER_ID)
    .single();

  if (professionalError) {
    console.error('❌ Error fetching professional data:', professionalError);
    return;
  }

  // Test bio
  results.push({
    field: 'bio',
    expected: 'Non-empty string',
    actual: professionalData.bio,
    passed: !!professionalData.bio?.trim(),
    message: professionalData.bio?.trim()
      ? `✅ bio is set (${professionalData.bio.length} characters)`
      : `❌ bio is missing`
  });

  // Test location
  results.push({
    field: 'location',
    expected: 'Non-empty string',
    actual: professionalData.location,
    passed: !!professionalData.location?.trim(),
    message: professionalData.location?.trim()
      ? `✅ location is set: "${professionalData.location}"`
      : `❌ location is missing`
  });

  // Test experience_years
  results.push({
    field: 'experience_years',
    expected: 'Number > 0',
    actual: professionalData.experience_years,
    passed: professionalData.experience_years > 0,
    message: professionalData.experience_years > 0
      ? `✅ experience_years is set: ${professionalData.experience_years}`
      : `❌ experience_years is missing or 0`
  });

  // Test hourly_rate
  results.push({
    field: 'hourly_rate',
    expected: 'Number > 0',
    actual: professionalData.hourly_rate,
    passed: professionalData.hourly_rate > 0,
    message: professionalData.hourly_rate > 0
      ? `✅ hourly_rate is set: £${professionalData.hourly_rate}`
      : `❌ hourly_rate is missing or 0`
  });

  // Test registration_number
  results.push({
    field: 'registration_number',
    expected: 'Non-empty string',
    actual: professionalData.registration_number,
    passed: !!professionalData.registration_number?.trim(),
    message: professionalData.registration_number?.trim()
      ? `✅ registration_number is set`
      : `❌ registration_number is missing`
  });

  // Test professional_body
  results.push({
    field: 'professional_body',
    expected: 'Non-empty string',
    actual: professionalData.professional_body,
    passed: !!professionalData.professional_body?.trim(),
    message: professionalData.professional_body?.trim()
      ? `✅ professional_body is set: "${professionalData.professional_body}"`
      : `❌ professional_body is missing`
  });

  // Test services_offered
  results.push({
    field: 'services_offered',
    expected: 'Array with items',
    actual: professionalData.services_offered,
    passed: Array.isArray(professionalData.services_offered) && professionalData.services_offered.length > 0,
    message: Array.isArray(professionalData.services_offered) && professionalData.services_offered.length > 0
      ? `✅ services_offered is set: ${professionalData.services_offered.length} service(s)`
      : `❌ services_offered is missing or empty`
  });

  // Test location coordinates
  results.push({
    field: 'latitude/longitude',
    expected: 'Numbers',
    actual: { lat: professionalData.latitude, lon: professionalData.longitude },
    passed: professionalData.latitude !== null && professionalData.longitude !== null,
    message: professionalData.latitude !== null && professionalData.longitude !== null
      ? `✅ Location coordinates are set: (${professionalData.latitude}, ${professionalData.longitude})`
      : `❌ Location coordinates are missing`
  });

  // Test service_radius_km
  results.push({
    field: 'service_radius_km',
    expected: 'Number',
    actual: professionalData.service_radius_km,
    passed: professionalData.service_radius_km !== null && professionalData.service_radius_km > 0,
    message: professionalData.service_radius_km !== null && professionalData.service_radius_km > 0
      ? `✅ service_radius_km is set: ${professionalData.service_radius_km}km`
      : `❌ service_radius_km is missing`
  });

  // Test 3: Specializations
  console.log('📋 Testing Specializations...');
  const { data: specializations, error: specError } = await supabase
    .from('practitioner_specializations')
    .select('specialization_id, specializations(name)')
    .eq('practitioner_id', USER_ID);

  if (specError) {
    console.error('❌ Error fetching specializations:', specError);
  } else {
    results.push({
      field: 'specializations',
      expected: 'At least 1 specialization',
      actual: specializations?.length || 0,
      passed: (specializations?.length || 0) > 0,
      message: (specializations?.length || 0) > 0
        ? `✅ ${specializations.length} specialization(s) found: ${specializations.map((s: any) => s.specializations?.name).join(', ')}`
        : `❌ No specializations found in practitioner_specializations table`
    });
  }

  // Test 4: Qualifications
  console.log('📋 Testing Qualifications...');
  const { data: qualifications, error: qualError } = await supabase
    .from('qualifications')
    .select('id, name, institution, year_obtained, certificate_url')
    .eq('practitioner_id', USER_ID);

  if (qualError) {
    console.error('❌ Error fetching qualifications:', qualError);
  } else {
    results.push({
      field: 'qualifications',
      expected: 'At least 1 qualification',
      actual: qualifications?.length || 0,
      passed: (qualifications?.length || 0) > 0,
      message: (qualifications?.length || 0) > 0
        ? `✅ ${qualifications.length} qualification(s) found: ${qualifications.map((q: any) => q.name).join(', ')}`
        : `❌ No qualifications found in qualifications table (qualification_type: ${professionalData.qualification_type || 'null'})`
    });
  }

  // Test 5: Therapist Profile (professional_statement, treatment_philosophy)
  console.log('📋 Testing Therapist Profile...');
  const { data: therapistProfile, error: therapistError } = await supabase
    .from('therapist_profiles')
    .select('professional_statement, treatment_philosophy')
    .eq('user_id', USER_ID)
    .maybeSingle();

  if (therapistError) {
    console.error('❌ Error fetching therapist profile:', therapistError);
  } else {
    results.push({
      field: 'therapist_profiles',
      expected: 'Record exists',
      actual: therapistProfile ? 'exists' : 'missing',
      passed: !!therapistProfile,
      message: therapistProfile
        ? `✅ Therapist profile record exists`
        : `⚠️ Therapist profile record does not exist (may be optional)`
    });
  }

  // Test 6: Onboarding Status
  console.log('📋 Testing Onboarding Status...');
  const { data: onboardingStatus, error: statusError } = await supabase
    .from('users')
    .select('onboarding_status, profile_completed')
    .eq('id', USER_ID)
    .single();

  if (statusError) {
    console.error('❌ Error fetching onboarding status:', statusError);
  } else {
    results.push({
      field: 'onboarding_status',
      expected: 'completed',
      actual: onboardingStatus.onboarding_status,
      passed: onboardingStatus.onboarding_status === 'completed',
      message: onboardingStatus.onboarding_status === 'completed'
        ? `✅ onboarding_status is "completed"`
        : `❌ onboarding_status is "${onboardingStatus.onboarding_status}" (expected "completed")`
    });

    results.push({
      field: 'profile_completed',
      expected: true,
      actual: onboardingStatus.profile_completed,
      passed: onboardingStatus.profile_completed === true,
      message: onboardingStatus.profile_completed === true
        ? `✅ profile_completed is true`
        : `❌ profile_completed is ${onboardingStatus.profile_completed} (expected true)`
    });
  }

  // Print Results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(result => {
    console.log(result.message);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);
  console.log('='.repeat(60) + '\n');

  // Calculate profile completion
  const profileCompletionFields = [
    'first_name', 'last_name', 'email', 'phone', 'profile_photo_url',
    'bio', 'location', 'experience_years', 'hourly_rate', 'registration_number',
    'specializations', 'qualifications'
  ];

  const completedFields = profileCompletionFields.filter(field => {
    const result = results.find(r => r.field === field);
    return result?.passed;
  }).length;

  const profileCompletion = Math.round((completedFields / profileCompletionFields.length) * 100);
  console.log(`📊 Calculated Profile Completion: ${profileCompletion}% (${completedFields}/${profileCompletionFields.length} fields)`);
  console.log('\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! Onboarding data is correctly saved.');
  } else {
    console.log('⚠️ Some tests failed. Review the results above to identify missing data.');
  }
}

// Run the test
testOnboardingDataPersistence().catch(console.error);

