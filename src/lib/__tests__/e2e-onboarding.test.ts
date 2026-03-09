/**
 * End-to-End Test for Onboarding Flow
 * This test creates a test user, completes onboarding, and verifies all data is saved correctly
 * 
 * To run: npx vitest run src/lib/__tests__/e2e-onboarding.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Missing Supabase credentials. Skipping E2E tests.');
}

// Use service role for admin operations, anon for user operations
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;
const supabaseAnon = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

describe('E2E Onboarding Flow', () => {
  let testUserId: string | null = null;
  let testEmail: string;

  beforeAll(async () => {
    if (!supabaseAdmin) {
      console.warn('⚠️ Skipping E2E tests - no admin client');
      return;
    }

    // Create a test user
    testEmail = `test-onboarding-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authData.user.id;

    // Set user role to massage_therapist
    await supabaseAdmin
      .from('users')
      .update({ user_role: 'massage_therapist' })
      .eq('id', testUserId);
  });

  afterAll(async () => {
    if (!supabaseAdmin || !testUserId) return;

    // Clean up: Delete test user and all related data
    try {
      // Delete from junction tables
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
      
      // Delete user
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUserId);
      
      // Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
  });

  it('should complete onboarding and save all data correctly', async () => {
    if (!supabaseAdmin || !testUserId || !supabaseAnon) {
      console.warn('⚠️ Skipping test - missing setup');
      return;
    }

    // Simulate onboarding data
    const onboardingData = {
      firstName: 'Test',
      lastName: 'User',
      phone: '+441234567890',
      location: 'London, UK',
      bio: 'Test bio with more than 50 characters to meet validation requirements',
      experience_years: '5',
      professional_body: 'cnhc',
      registration_number: 'TEST123',
      qualification_type: 'level_4_massage',
      services_offered: ['sports_massage', 'trigger_point', 'deep_tissue'],
      latitude: 51.5074,
      longitude: -0.1278,
      service_radius_km: 25,
      response_time_hours: 24
    };

    // Simulate the onboarding completion (this would normally be done via the UI)
    // For testing, we'll directly call the database operations
    
    // 1. Update user table with basic and professional data
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        first_name: onboardingData.firstName,
        last_name: onboardingData.lastName,
        phone: onboardingData.phone,
        location: onboardingData.location,
        bio: onboardingData.bio,
        experience_years: parseInt(onboardingData.experience_years),
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

    expect(userUpdateError).toBeNull();

    // 2. Map services_offered to specializations
    const { data: availableSpecs } = await supabaseAdmin
      .from('specializations')
      .select('id, name, category')
      .eq('category', 'massage_therapist');

    if (availableSpecs && availableSpecs.length > 0) {
      const serviceToSpecializationMap: Record<string, string[]> = {
        'sports_massage': ['Sports Massage'],
        'deep_tissue': ['Deep Tissue Massage'],
        'trigger_point': ['Massage Therapy', 'Deep Tissue Massage']
      };

      const matchedSpecIds = new Set<string>();
      
      onboardingData.services_offered.forEach((service: string) => {
        const mappedNames = serviceToSpecializationMap[service] || [];
        mappedNames.forEach(mappedName => {
          const matchingSpec = availableSpecs.find(spec => 
            spec.name.toLowerCase() === mappedName.toLowerCase()
          );
          if (matchingSpec) {
            matchedSpecIds.add(matchingSpec.id);
          }
        });
      });

      // Save specializations
      if (matchedSpecIds.size > 0) {
        const specInserts = Array.from(matchedSpecIds).map(specId => ({
          practitioner_id: testUserId,
          specialization_id: specId
        }));

        const { error: specError } = await supabaseAdmin
          .from('practitioner_specializations')
          .insert(specInserts);

        expect(specError).toBeNull();
      }
    }

    // 3. Create qualification entry
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

    expect(qualError).toBeNull();

    // 4. Verify all data was saved correctly
    const { data: userData, error: userFetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    expect(userFetchError).toBeNull();
    expect(userData).toBeTruthy();
    expect(userData?.first_name).toBe(onboardingData.firstName);
    expect(userData?.last_name).toBe(onboardingData.lastName);
    expect(userData?.phone).toBe(onboardingData.phone);
    expect(userData?.bio).toBe(onboardingData.bio);
    expect(userData?.services_offered).toEqual(onboardingData.services_offered);

    // 5. Verify specializations
    const { data: specializations, error: specFetchError } = await supabaseAdmin
      .from('practitioner_specializations')
      .select('specialization_id, specializations(name)')
      .eq('practitioner_id', testUserId);

    expect(specFetchError).toBeNull();
    expect(specializations).toBeTruthy();
    expect(specializations?.length).toBeGreaterThan(0);
    expect(specializations?.length).toBeGreaterThanOrEqual(2); // Should have at least 2

    // 6. Verify qualifications
    const { data: qualifications, error: qualFetchError } = await supabaseAdmin
      .from('qualifications')
      .select('*')
      .eq('practitioner_id', testUserId);

    expect(qualFetchError).toBeNull();
    expect(qualifications).toBeTruthy();
    expect(qualifications?.length).toBe(1);
    expect(qualifications?.[0].name).toBe(qualName);

    // 7. Calculate profile completion
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

    expect(completionPercentage).toBeGreaterThan(42); // Should be much higher than 42%
    expect(completionPercentage).toBeGreaterThanOrEqual(70); // Should be at least 70% with all required fields

    console.log(`✅ Profile completion: ${completionPercentage}% (${totalCompleted}/${totalFields} fields)`);
  });
});

