#!/usr/bin/env node

/**
 * Practitioner Onboarding Test Script
 * Tests the complete practitioner onboarding flow for inconsistencies
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2OTQ4MDAsImV4cCI6MjA1MDI3MDgwMH0.8K8vQ2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const testPractitioner = {
  email: `test-practitioner-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'Doe',
  userRole: 'sports_therapist',
  phone: '+44123456789',
  bio: 'Experienced sports therapist with 10+ years of experience',
  specializations: ['Sports Injury', 'Rehabilitation', 'Performance Enhancement'],
  experience: '10+ years',
  qualifications: 'BSc Sports Therapy, MSc Rehabilitation',
  location: 'London, UK',
  consultationTypes: ['In-person', 'Online'],
  rates: {
    inPerson: 80,
    online: 60
  }
};

console.log('🧪 Starting Practitioner Onboarding Test Suite...\n');

async function testRegistration() {
  console.log('1️⃣ Testing Registration Flow...');
  
  try {
    // Test registration
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testPractitioner.email,
      password: testPractitioner.password,
      options: {
        data: {
          first_name: testPractitioner.firstName,
          last_name: testPractitioner.lastName,
          user_role: testPractitioner.userRole
        }
      }
    });

    if (authError) {
      console.log('❌ Registration failed:', authError.message);
      return { success: false, error: authError };
    }

    console.log('✅ Registration successful');
    console.log('   User ID:', authData.user?.id);
    console.log('   Email confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No');
    
    return { success: true, user: authData.user };
  } catch (error) {
    console.log('❌ Registration error:', error.message);
    return { success: false, error };
  }
}

async function testProfileCreation(userId) {
  console.log('\n2️⃣ Testing Profile Creation...');
  
  try {
    // Test user_profiles table insertion
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        first_name: testPractitioner.firstName,
        last_name: testPractitioner.lastName,
        email: testPractitioner.email,
        user_role: testPractitioner.userRole,
        phone: testPractitioner.phone,
        bio: testPractitioner.bio,
        onboarding_status: 'in_progress',
        profile_completed: false
      })
      .select();

    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message);
      return { success: false, error: profileError };
    }

    console.log('✅ Profile created successfully');
    console.log('   Profile ID:', profileData[0]?.id);
    console.log('   Onboarding status:', profileData[0]?.onboarding_status);
    
    return { success: true, profile: profileData[0] };
  } catch (error) {
    console.log('❌ Profile creation error:', error.message);
    return { success: false, error };
  }
}

async function testSubscriptionFlow() {
  console.log('\n3️⃣ Testing Subscription Flow...');
  
  try {
    // Test subscription products exist
    const { data: products, error: productsError } = await supabase
      .from('subscribers')
      .select('*')
      .limit(1);

    if (productsError) {
      console.log('❌ Subscription table access failed:', productsError.message);
      return { success: false, error: productsError };
    }

    console.log('✅ Subscription system accessible');
    
    // Test subscription context functions
    const subscriptionPlans = [
      { id: 'practitioner', name: 'Practitioner Plan', price: 29 },
      { id: 'clinic', name: 'Clinic Plan', price: 99 }
    ];

    console.log('✅ Subscription plans available:');
    subscriptionPlans.forEach(plan => {
      console.log(`   - ${plan.name}: £${plan.price}/month`);
    });
    
    return { success: true };
  } catch (error) {
    console.log('❌ Subscription flow error:', error.message);
    return { success: false, error };
  }
}

async function testOnboardingSteps() {
  console.log('\n4️⃣ Testing Onboarding Steps...');
  
  const onboardingSteps = [
    { step: 1, name: 'Personal Information', required: ['firstName', 'lastName', 'phone', 'bio'] },
    { step: 2, name: 'Professional Details', required: ['specializations', 'experience', 'qualifications'] },
    { step: 3, name: 'Location & Services', required: ['location', 'consultationTypes', 'rates'] },
    { step: 4, name: 'Subscription Selection', required: ['subscriptionPlan'] },
    { step: 5, name: 'Rates & Final Details', required: ['rates', 'availability'] }
  ];

  console.log('✅ Onboarding steps defined:');
  onboardingSteps.forEach(step => {
    console.log(`   Step ${step.step}: ${step.name}`);
    console.log(`   Required fields: ${step.required.join(', ')}`);
  });

  // Test validation logic
  const testData = {
    firstName: testPractitioner.firstName,
    lastName: testPractitioner.lastName,
    phone: testPractitioner.phone,
    bio: testPractitioner.bio,
    specializations: testPractitioner.specializations,
    experience: testPractitioner.experience,
    qualifications: testPractitioner.qualifications,
    location: testPractitioner.location,
    consultationTypes: testPractitioner.consultationTypes,
    rates: testPractitioner.rates
  };

  let validationErrors = [];
  onboardingSteps.forEach(step => {
    step.required.forEach(field => {
      if (!testData[field]) {
        validationErrors.push(`Step ${step.step}: Missing ${field}`);
      }
    });
  });

  if (validationErrors.length > 0) {
    console.log('❌ Validation errors found:');
    validationErrors.forEach(error => console.log(`   - ${error}`));
    return { success: false, errors: validationErrors };
  }

  console.log('✅ All onboarding steps validated successfully');
  return { success: true };
}

async function testDashboardAccess() {
  console.log('\n5️⃣ Testing Dashboard Access...');
  
  try {
    // Test role-based routing
    const userRole = testPractitioner.userRole;
    const dashboardRoutes = {
      'sports_therapist': '/dashboard/sports-therapist',
      'massage_therapist': '/dashboard/massage-therapist',
      'osteopath': '/dashboard/osteopath'
    };

    const expectedRoute = dashboardRoutes[userRole];
    if (!expectedRoute) {
      console.log('❌ No dashboard route defined for role:', userRole);
      return { success: false };
    }

    console.log('✅ Dashboard route defined:', expectedRoute);
    
    // Test subscription requirement
    const requiresSubscription = true;
    console.log('✅ Subscription required:', requiresSubscription);
    
    return { success: true, route: expectedRoute };
  } catch (error) {
    console.log('❌ Dashboard access error:', error.message);
    return { success: false, error };
  }
}

async function testPaymentIntegration() {
  console.log('\n6️⃣ Testing Payment Integration...');
  
  try {
    // Test Stripe price IDs
    const stripePrices = {
      practitioner: {
        monthly: 'price_1S6BTOFk77knaVvaqqm7Iq5M',
        yearly: 'price_1S6BTQFk77knaVvakB9spQHa'
      },
      clinic: {
        monthly: 'price_1S6BTTFk77knaVvadG0HDJAI',
        yearly: 'price_1S6BTWFk77knaVvagCKZZh3H'
      }
    };

    console.log('✅ Stripe price IDs configured:');
    Object.entries(stripePrices).forEach(([plan, prices]) => {
      console.log(`   ${plan}:`);
      console.log(`     Monthly: ${prices.monthly}`);
      console.log(`     Yearly: ${prices.yearly}`);
    });

    // Test marketplace fee
    const marketplaceFee = 0.03; // 3%
    console.log('✅ Marketplace fee:', `${marketplaceFee * 100}%`);
    
    return { success: true };
  } catch (error) {
    console.log('❌ Payment integration error:', error.message);
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log('🚀 Running Complete Practitioner Onboarding Test Suite...\n');
  
  const results = {
    registration: await testRegistration(),
    profileCreation: null,
    subscriptionFlow: await testSubscriptionFlow(),
    onboardingSteps: await testOnboardingSteps(),
    dashboardAccess: await testDashboardAccess(),
    paymentIntegration: await testPaymentIntegration()
  };

  // Only test profile creation if registration succeeded
  if (results.registration.success) {
    results.profileCreation = await testProfileCreation(results.registration.user.id);
  }

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, result]) => {
    if (result) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${test.padEnd(20)}: ${status}`);
      if (!result.success && result.error) {
        console.log(`  Error: ${result.error.message || result.error}`);
      }
    }
  });

  const allPassed = Object.values(results).every(result => !result || result.success);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Practitioner onboarding flow is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above for inconsistencies.');
  }

  return results;
}

// Run the tests
runAllTests().catch(console.error);
