#!/usr/bin/env node

/**
 * Practitioner Registration Flow Test
 * Tests the complete registration journey for practitioners
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TESTING PRACTITIONER REGISTRATION FLOW');
console.log('==========================================\n');

// Test results tracking
const tests = {
  passed: 0,
  failed: 0,
  total: 0
};

function test(name, condition, details = '') {
  tests.total++;
  if (condition) {
    tests.passed++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    tests.failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
}

// Test 1: Check Register.tsx has correct logic
console.log('📋 TEST 1: Registration Logic');
console.log('-----------------------------');

try {
  const registerFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/Register.tsx'), 'utf8');
  
  test(
    'Always redirects to verification page',
    registerFile.includes('navigate(\'/auth/verify-email\'') && !registerFile.includes('Registration successful! You can now sign in.'),
    'Registration should always go to verification page'
  );
  
  test(
    'Has proper success message',
    registerFile.includes('Registration successful! Please check your email to verify your account.'),
    'Should show verification message, not sign-in message'
  );
  
  test(
    'Includes debug logging',
    registerFile.includes('console.log(\'📧 Registration data:\', signUpData)'),
    'Should have debug logs for troubleshooting'
  );
  
} catch (error) {
  test('Register.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 2: Check EmailVerification.tsx has auto-detection
console.log('\n📧 TEST 2: Email Verification Component');
console.log('--------------------------------------');

try {
  const emailVerificationFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/EmailVerification.tsx'), 'utf8');
  
  test(
    'Has auto-detection for verified users',
    emailVerificationFile.includes('checkUserStatus') && emailVerificationFile.includes('user.email_confirmed_at'),
    'Should automatically detect already verified users'
  );
  
  test(
    'Has development bypass',
    emailVerificationFile.includes('Skip Verification (Dev Only)'),
    'Should have dev bypass for testing'
  );
  
  test(
    'Has proper error handling',
    emailVerificationFile.includes('Verification failed. Please try again.'),
    'Should handle verification errors gracefully'
  );
  
} catch (error) {
  test('EmailVerification.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 3: Check AuthCallback.tsx has proper verification check
console.log('\n🔄 TEST 3: Auth Callback Component');
console.log('--------------------------------');

try {
  const authCallbackFile = fs.readFileSync(path.join(__dirname, 'src/components/auth/AuthCallback.tsx'), 'utf8');
  
  test(
    'Checks email verification status',
    authCallbackFile.includes('!session.user.email_confirmed_at'),
    'Should verify email before proceeding'
  );
  
  test(
    'Has enhanced logging',
    authCallbackFile.includes('console.log(\'📧 User email:\', session.user.email)'),
    'Should have detailed logging for debugging'
  );
  
  test(
    'Redirects to verification page',
    authCallbackFile.includes('navigate(\'/auth/verify-email\''),
    'Should redirect unverified users to verification'
  );
  
} catch (error) {
  test('AuthCallback.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 4: Check AuthContext.tsx has proper signup flow
console.log('\n🔐 TEST 4: Auth Context');
console.log('----------------------');

try {
  const authContextFile = fs.readFileSync(path.join(__dirname, 'src/contexts/AuthContext.tsx'), 'utf8');
  
  test(
    'Uses correct redirect URL',
    authContextFile.includes('emailRedirectTo: redirectUrl') && authContextFile.includes('/auth/verify-email'),
    'Should redirect to verification page'
  );
  
  test(
    'Has debug logging',
    authContextFile.includes('console.log(\'🔄 Starting signup process...\')'),
    'Should have comprehensive logging'
  );
  
  test(
    'Includes user metadata',
    authContextFile.includes('user_role: userData.user_role'),
    'Should pass user role to Supabase'
  );
  
} catch (error) {
  test('AuthContext.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 5: Check Supabase configuration
console.log('\n🗄️ TEST 5: Supabase Configuration');
console.log('--------------------------------');

try {
  const configFile = fs.readFileSync(path.join(__dirname, 'supabase/config.toml'), 'utf8');
  
  test(
    'Email confirmations enabled',
    configFile.includes('enable_confirmations = true'),
    'Should have email confirmations enabled'
  );
  
  test(
    'Has verification redirect URLs',
    configFile.includes('/auth/verify-email'),
    'Should include verification page in redirect URLs'
  );
  
  test(
    'Has production URLs',
    configFile.includes('vercel.app'),
    'Should include production Vercel URLs'
  );
  
} catch (error) {
  test('Supabase config.toml exists', false, `File not found: ${error.message}`);
}

// Test 6: Check routing configuration
console.log('\n🛣️ TEST 6: Routing Configuration');
console.log('--------------------------------');

try {
  const appContentFile = fs.readFileSync(path.join(__dirname, 'src/components/AppContent.tsx'), 'utf8');
  
  test(
    'Has verification route',
    appContentFile.includes('path="/auth/verify-email"'),
    'Should have verification route configured'
  );
  
  test(
    'Has callback route',
    appContentFile.includes('path="/auth/callback"'),
    'Should have auth callback route'
  );
  
  test(
    'Has registration success route',
    appContentFile.includes('path="/auth/registration-success"'),
    'Should have registration success route'
  );
  
} catch (error) {
  test('AppContent.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 7: Check for any bypass logic that might skip verification
console.log('\n⚠️ TEST 7: Bypass Logic Check');
console.log('----------------------------');

try {
  const registerFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/Register.tsx'), 'utf8');
  const authCallbackFile = fs.readFileSync(path.join(__dirname, 'src/components/auth/AuthCallback.tsx'), 'utf8');
  
  test(
    'No bypass logic in Register',
    !registerFile.includes('bypass') && !registerFile.includes('skip'),
    'Should not have bypass logic in registration'
  );
  
  test(
    'No bypass logic in AuthCallback',
    !authCallbackFile.includes('bypass') && !authCallbackFile.includes('skip'),
    'Should not have bypass logic in auth callback'
  );
  
} catch (error) {
  test('Bypass check completed', false, `Error: ${error.message}`);
}

// Summary
console.log('\n📊 TEST SUMMARY');
console.log('===============');
console.log(`Total Tests: ${tests.total}`);
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`Success Rate: ${Math.round((tests.passed / tests.total) * 100)}%`);

if (tests.failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('The practitioner registration flow should work correctly.');
} else {
  console.log('\n⚠️ SOME TESTS FAILED!');
  console.log('Please review the failed tests above.');
}

console.log('\n🔍 RECOMMENDATIONS:');
console.log('1. Test the registration flow in production');
console.log('2. Check Supabase email settings in dashboard');
console.log('3. Verify SMTP configuration');
console.log('4. Test with different email providers');
console.log('5. Monitor console logs during registration');

process.exit(tests.failed > 0 ? 1 : 0);
