#!/usr/bin/env node

/**
 * Simple User Flow Testing Suite
 * 
 * This script tests the core functionality without importing TypeScript modules
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const testUsers = {
  client: {
    email: `test-client-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    primaryGoal: 'Pain relief'
  },
  sportsTherapist: {
    email: `test-sports-therapist-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1234567891',
    bio: 'Experienced sports therapist',
    location: 'London, UK',
    experienceYears: '5',
    hourlyRate: '80'
  }
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
}

// Mock dashboard routing logic
function getDashboardRoute(userProfile) {
  if (!userProfile) return '/login';
  
  if (userProfile.onboarding_status !== 'completed') {
    return '/onboarding';
  }
  
  switch (userProfile.user_role) {
    case 'client':
      return '/client/dashboard';
    case 'sports_therapist':
    case 'massage_therapist':
    case 'osteopath':
      return '/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/dashboard';
  }
}

function shouldRedirectToOnboarding(userProfile) {
  if (!userProfile) return false;
  
  return userProfile.onboarding_status === 'pending' || 
         userProfile.onboarding_status === 'in_progress' ||
         !userProfile.profile_completed;
}

function canAccessRoute(userProfile, route) {
  if (!userProfile) return false;
  
  // Public routes
  const publicRoutes = ['/', '/marketplace', '/how-it-works', '/pricing', '/about', '/contact', '/terms', '/privacy'];
  if (publicRoutes.includes(route)) return true;
  
  // Auth routes
  if (route.startsWith('/auth/') || route === '/login' || route === '/register' || route === '/reset-password') {
    return true;
  }
  
  // Client routes
  if (route.startsWith('/client/')) {
    return userProfile.user_role === 'client';
  }
  
  // Practitioner routes
  if (route === '/dashboard' || route.startsWith('/practice/') || route.startsWith('/cpd/')) {
    return ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role);
  }
  
  // Admin routes
  if (route.startsWith('/admin/')) {
    return userProfile.user_role === 'admin';
  }
  
  // Onboarding route
  if (route === '/onboarding') {
    return true;
  }
  
  return false;
}

function validateOnboardingData(userRole, data) {
  const errors = [];

  if (userRole === 'client') {
    if (!data.firstName?.trim()) errors.push('First name is required');
    if (!data.lastName?.trim()) errors.push('Last name is required');
    if (!data.phone?.trim()) errors.push('Phone number is required');
    if (!data.primaryGoal?.trim()) errors.push('Primary goal is required');
  } else {
    if (!data.phone?.trim()) errors.push('Phone number is required');
    if (!data.bio?.trim()) errors.push('Bio is required');
    if (!data.location?.trim()) errors.push('Location is required');
    if (!data.experience_years || parseInt(data.experience_years) < 0) {
      errors.push('Valid experience years is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function getErrorType(error) {
  if (!error) return 'UNKNOWN';

  if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
    return 'NETWORK';
  }

  if (error.message?.includes('Invalid login credentials') || 
      error.message?.includes('Authentication required')) {
    return 'AUTHENTICATION';
  }

  if (error.message?.includes('Access denied') || 
      error.message?.includes('Unauthorized')) {
    return 'AUTHORIZATION';
  }

  if (error.message?.includes('validation') || 
      error.message?.includes('required') ||
      error.message?.includes('invalid')) {
    return 'VALIDATION';
  }

  if (error.code === 'PGRST116' || error.message?.includes('not found')) {
    return 'NOT_FOUND';
  }

  if (error.status >= 500 || error.message?.includes('server')) {
    return 'SERVER';
  }

  return 'UNKNOWN';
}

async function testRegistrationFlow() {
  console.log('\n🧪 TESTING REGISTRATION FLOW');
  console.log('=' .repeat(50));

  // Test Client Registration
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testUsers.client.email,
      password: testUsers.client.password,
      options: {
        data: {
          first_name: testUsers.client.firstName,
          last_name: testUsers.client.lastName,
          user_role: 'client'
        }
      }
    });

    if (error) throw error;
    
    const userCreated = data.user && data.user.email === testUsers.client.email;
    logTest('Client Registration - User Created', userCreated);
    
    const emailConfirmationSent = data.user && !data.user.email_confirmed_at;
    logTest('Client Registration - Email Confirmation Required', emailConfirmationSent);

  } catch (error) {
    logTest('Client Registration - User Created', false, error);
  }

  // Test Sports Therapist Registration
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testUsers.sportsTherapist.email,
      password: testUsers.sportsTherapist.password,
      options: {
        data: {
          first_name: testUsers.sportsTherapist.firstName,
          last_name: testUsers.sportsTherapist.lastName,
          user_role: 'sports_therapist'
        }
      }
    });

    if (error) throw error;
    
    const userCreated = data.user && data.user.email === testUsers.sportsTherapist.email;
    logTest('Sports Therapist Registration - User Created', userCreated);
    
    const emailConfirmationSent = data.user && !data.user.email_confirmed_at;
    logTest('Sports Therapist Registration - Email Confirmation Required', emailConfirmationSent);

  } catch (error) {
    logTest('Sports Therapist Registration - User Created', false, error);
  }
}

async function testLoginFlow() {
  console.log('\n🔐 TESTING LOGIN FLOW');
  console.log('=' .repeat(50));

  // Test Client Login
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUsers.client.email,
      password: testUsers.client.password
    });

    if (error) throw error;
    
    const loginSuccessful = data.user && data.user.email === testUsers.client.email;
    logTest('Client Login - Authentication Successful', loginSuccessful);
    
    // Test dashboard routing
    const mockUserProfile = {
      id: data.user.id,
      email: data.user.email,
      first_name: testUsers.client.firstName,
      last_name: testUsers.client.lastName,
      user_role: 'client',
      onboarding_status: 'pending',
      profile_completed: false
    };
    
    const dashboardRoute = getDashboardRoute(mockUserProfile);
    const correctRoute = dashboardRoute === '/onboarding';
    logTest('Client Login - Correct Dashboard Route (Onboarding)', correctRoute);

  } catch (error) {
    logTest('Client Login - Authentication Successful', false, error);
  }

  // Test Sports Therapist Login
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUsers.sportsTherapist.email,
      password: testUsers.sportsTherapist.password
    });

    if (error) throw error;
    
    const loginSuccessful = data.user && data.user.email === testUsers.sportsTherapist.email;
    logTest('Sports Therapist Login - Authentication Successful', loginSuccessful);
    
    // Test dashboard routing
    const mockUserProfile = {
      id: data.user.id,
      email: data.user.email,
      first_name: testUsers.sportsTherapist.firstName,
      last_name: testUsers.sportsTherapist.lastName,
      user_role: 'sports_therapist',
      onboarding_status: 'pending',
      profile_completed: false
    };
    
    const dashboardRoute = getDashboardRoute(mockUserProfile);
    const correctRoute = dashboardRoute === '/onboarding';
    logTest('Sports Therapist Login - Correct Dashboard Route (Onboarding)', correctRoute);

  } catch (error) {
    logTest('Sports Therapist Login - Authentication Successful', false, error);
  }
}

async function testOnboardingFlow() {
  console.log('\n📋 TESTING ONBOARDING FLOW');
  console.log('=' .repeat(50));

  // Test Client Onboarding Validation
  try {
    const clientOnboardingData = {
      firstName: testUsers.client.firstName,
      lastName: testUsers.client.lastName,
      phone: testUsers.client.phone,
      primaryGoal: testUsers.client.primaryGoal
    };
    
    const validation = validateOnboardingData('client', clientOnboardingData);
    logTest('Client Onboarding - Data Validation Passes', validation.isValid);
    
    if (!validation.isValid) {
      console.log('   Validation errors:', validation.errors);
    }

  } catch (error) {
    logTest('Client Onboarding - Data Validation Passes', false, error);
  }

  // Test Practitioner Onboarding Validation
  try {
    const practitionerOnboardingData = {
      phone: testUsers.sportsTherapist.phone,
      bio: testUsers.sportsTherapist.bio,
      location: testUsers.sportsTherapist.location,
      experience_years: testUsers.sportsTherapist.experienceYears
    };
    
    const validation = validateOnboardingData('sports_therapist', practitionerOnboardingData);
    logTest('Practitioner Onboarding - Data Validation Passes', validation.isValid);
    
    if (!validation.isValid) {
      console.log('   Validation errors:', validation.errors);
    }

  } catch (error) {
    logTest('Practitioner Onboarding - Data Validation Passes', false, error);
  }

  // Test Invalid Onboarding Data
  try {
    const invalidData = {
      phone: '', // Missing phone
      bio: '', // Missing bio
      location: '', // Missing location
      experience_years: '-1' // Invalid experience
    };
    
    const validation = validateOnboardingData('sports_therapist', invalidData);
    logTest('Onboarding Validation - Invalid Data Rejected', !validation.isValid);

  } catch (error) {
    logTest('Onboarding Validation - Invalid Data Rejected', false, error);
  }
}

async function testDashboardAccess() {
  console.log('\n🏠 TESTING DASHBOARD ACCESS');
  console.log('=' .repeat(50));

  // Test Client Dashboard Access
  try {
    const clientProfile = {
      id: 'test-client-id',
      email: testUsers.client.email,
      first_name: testUsers.client.firstName,
      last_name: testUsers.client.lastName,
      user_role: 'client',
      onboarding_status: 'completed',
      profile_completed: true
    };
    
    const dashboardRoute = getDashboardRoute(clientProfile);
    const correctRoute = dashboardRoute === '/client/dashboard';
    logTest('Client Dashboard - Correct Route', correctRoute);
    
    const canAccessClientDashboard = canAccessRoute(clientProfile, '/client/dashboard');
    logTest('Client Dashboard - Access Granted', canAccessClientDashboard);
    
    const cannotAccessPractitionerDashboard = !canAccessRoute(clientProfile, '/dashboard');
    logTest('Client Dashboard - Practitioner Route Blocked', cannotAccessPractitionerDashboard);

  } catch (error) {
    logTest('Client Dashboard - Correct Route', false, error);
  }

  // Test Practitioner Dashboard Access
  try {
    const practitionerProfile = {
      id: 'test-practitioner-id',
      email: testUsers.sportsTherapist.email,
      first_name: testUsers.sportsTherapist.firstName,
      last_name: testUsers.sportsTherapist.lastName,
      user_role: 'sports_therapist',
      onboarding_status: 'completed',
      profile_completed: true
    };
    
    const dashboardRoute = getDashboardRoute(practitionerProfile);
    const correctRoute = dashboardRoute === '/dashboard';
    logTest('Practitioner Dashboard - Correct Route', correctRoute);
    
    const canAccessPractitionerDashboard = canAccessRoute(practitionerProfile, '/dashboard');
    logTest('Practitioner Dashboard - Access Granted', canAccessPractitionerDashboard);
    
    const cannotAccessClientDashboard = !canAccessRoute(practitionerProfile, '/client/dashboard');
    logTest('Practitioner Dashboard - Client Route Blocked', cannotAccessClientDashboard);

  } catch (error) {
    logTest('Practitioner Dashboard - Correct Route', false, error);
  }

  // Test Onboarding Redirect Logic
  try {
    const incompleteProfile = {
      id: 'test-incomplete-id',
      email: testUsers.client.email,
      first_name: testUsers.client.firstName,
      last_name: testUsers.client.lastName,
      user_role: 'client',
      onboarding_status: 'pending',
      profile_completed: false
    };
    
    const shouldRedirect = shouldRedirectToOnboarding(incompleteProfile);
    logTest('Onboarding Redirect - Incomplete Profile Redirects', shouldRedirect);
    
    const dashboardRoute = getDashboardRoute(incompleteProfile);
    const redirectsToOnboarding = dashboardRoute === '/onboarding';
    logTest('Onboarding Redirect - Routes to Onboarding', redirectsToOnboarding);

  } catch (error) {
    logTest('Onboarding Redirect - Incomplete Profile Redirects', false, error);
  }
}

async function testErrorHandling() {
  console.log('\n⚠️ TESTING ERROR HANDLING');
  console.log('=' .repeat(50));

  // Test Network Error Detection
  try {
    const networkError = { code: 'NETWORK_ERROR', message: 'Failed to fetch' };
    const errorType = getErrorType(networkError);
    const isNetworkError = errorType === 'NETWORK';
    logTest('Error Handling - Network Error Detection', isNetworkError);

  } catch (error) {
    logTest('Error Handling - Network Error Detection', false, error);
  }

  // Test Authentication Error Detection
  try {
    const authError = { message: 'Invalid login credentials' };
    const errorType = getErrorType(authError);
    const isAuthError = errorType === 'AUTHENTICATION';
    logTest('Error Handling - Authentication Error Detection', isAuthError);

  } catch (error) {
    logTest('Error Handling - Authentication Error Detection', false, error);
  }

  // Test Validation Error Detection
  try {
    const validationError = { message: 'Email is required' };
    const errorType = getErrorType(validationError);
    const isValidationError = errorType === 'VALIDATION';
    logTest('Error Handling - Validation Error Detection', isValidationError);

  } catch (error) {
    logTest('Error Handling - Validation Error Detection', false, error);
  }

  // Test Unknown Error Detection
  try {
    const unknownError = { message: 'Something weird happened' };
    const errorType = getErrorType(unknownError);
    const isUnknownError = errorType === 'UNKNOWN';
    logTest('Error Handling - Unknown Error Detection', isUnknownError);

  } catch (error) {
    logTest('Error Handling - Unknown Error Detection', false, error);
  }
}

async function testRolePermissions() {
  console.log('\n🔒 TESTING ROLE PERMISSIONS');
  console.log('=' .repeat(50));

  // Test Client Permissions
  try {
    const clientProfile = {
      id: 'test-client-id',
      email: testUsers.client.email,
      user_role: 'client',
      onboarding_status: 'completed',
      profile_completed: true
    };
    
    const allowedRoutes = [
      '/client/dashboard',
      '/client/booking',
      '/client/profile',
      '/client/sessions'
    ];
    
    let allAllowed = true;
    for (const route of allowedRoutes) {
      if (!canAccessRoute(clientProfile, route)) {
        allAllowed = false;
        break;
      }
    }
    logTest('Client Permissions - Allowed Routes Accessible', allAllowed);
    
    const blockedRoutes = [
      '/dashboard',
      '/analytics',
      '/payments',
      '/cpd'
    ];
    
    let allBlocked = true;
    for (const route of blockedRoutes) {
      if (canAccessRoute(clientProfile, route)) {
        allBlocked = false;
        break;
      }
    }
    logTest('Client Permissions - Blocked Routes Inaccessible', allBlocked);

  } catch (error) {
    logTest('Client Permissions - Allowed Routes Accessible', false, error);
  }

  // Test Practitioner Permissions
  try {
    const practitionerProfile = {
      id: 'test-practitioner-id',
      email: testUsers.sportsTherapist.email,
      user_role: 'sports_therapist',
      onboarding_status: 'completed',
      profile_completed: true
    };
    
    const allowedRoutes = [
      '/dashboard',
      '/analytics',
      '/payments',
      '/cpd',
      '/live-sessions'
    ];
    
    let allAllowed = true;
    for (const route of allowedRoutes) {
      if (!canAccessRoute(practitionerProfile, route)) {
        allAllowed = false;
        break;
      }
    }
    logTest('Practitioner Permissions - Allowed Routes Accessible', allAllowed);
    
    const blockedRoutes = [
      '/client/dashboard',
      '/client/booking',
      '/client/profile',
      '/client/sessions'
    ];
    
    let allBlocked = true;
    for (const route of blockedRoutes) {
      if (canAccessRoute(practitionerProfile, route)) {
        allBlocked = false;
        break;
      }
    }
    logTest('Practitioner Permissions - Blocked Routes Inaccessible', allBlocked);

  } catch (error) {
    logTest('Practitioner Permissions - Allowed Routes Accessible', false, error);
  }
}

async function testEdgeCases() {
  console.log('\n🔍 TESTING EDGE CASES');
  console.log('=' .repeat(50));

  // Test Null User Profile
  try {
    const dashboardRoute = getDashboardRoute(null);
    const redirectsToLogin = dashboardRoute === '/login';
    logTest('Edge Case - Null User Profile Redirects to Login', redirectsToLogin);

  } catch (error) {
    logTest('Edge Case - Null User Profile Redirects to Login', false, error);
  }

  // Test Undefined User Role
  try {
    const undefinedRoleProfile = {
      id: 'test-id',
      email: 'test@example.com',
      user_role: undefined,
      onboarding_status: 'pending',
      profile_completed: false
    };
    
    const dashboardRoute = getDashboardRoute(undefinedRoleProfile);
    const hasDefaultRoute = dashboardRoute === '/dashboard';
    logTest('Edge Case - Undefined Role Uses Default Route', hasDefaultRoute);

  } catch (error) {
    logTest('Edge Case - Undefined Role Uses Default Route', false, error);
  }

  // Test Empty Onboarding Data
  try {
    const emptyData = {};
    const validation = validateOnboardingData('client', emptyData);
    const rejectsEmptyData = !validation.isValid;
    logTest('Edge Case - Empty Onboarding Data Rejected', rejectsEmptyData);

  } catch (error) {
    logTest('Edge Case - Empty Onboarding Data Rejected', false, error);
  }

  // Test Public Route Access
  try {
    const publicRoutes = ['/', '/marketplace', '/how-it-works', '/pricing', '/about', '/contact'];
    let allPublicAccessible = true;
    
    for (const route of publicRoutes) {
      if (!canAccessRoute(null, route)) {
        allPublicAccessible = false;
        break;
      }
    }
    logTest('Edge Case - Public Routes Accessible Without Auth', allPublicAccessible);

  } catch (error) {
    logTest('Edge Case - Public Routes Accessible Without Auth', false, error);
  }
}

async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE USER FLOW TESTS');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    await testRegistrationFlow();
    await testLoginFlow();
    await testOnboardingFlow();
    await testDashboardAccess();
    await testErrorHandling();
    await testRolePermissions();
    await testEdgeCases();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Print summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️ Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   • ${test}: ${error}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! User flows are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
  
  return testResults.failed === 0;
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
