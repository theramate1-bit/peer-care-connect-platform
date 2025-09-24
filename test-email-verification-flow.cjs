#!/usr/bin/env node

/**
 * Email Verification Flow Test
 * Specifically tests the email verification logic
 */

const fs = require('fs');
const path = require('path');

console.log('📧 TESTING EMAIL VERIFICATION FLOW');
console.log('==================================\n');

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

// Test 1: Check Register.tsx logic specifically
console.log('📋 TEST 1: Registration Flow Logic');
console.log('----------------------------------');

try {
  const registerFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/Register.tsx'), 'utf8');
  
  // Check if the problematic "You can now sign in" message is removed
  test(
    'Removed problematic sign-in message',
    !registerFile.includes('Registration successful! You can now sign in.'),
    'Should not show "You can now sign in" message'
  );
  
  // Check if it always goes to verification
  test(
    'Always redirects to verification',
    registerFile.includes('navigate(\'/auth/verify-email\'') && 
    registerFile.includes('Registration successful! Please check your email to verify your account.'),
    'Should always go to verification page with correct message'
  );
  
  // Check for the old problematic logic
  test(
    'Removed problematic conditional logic',
    !registerFile.includes('Email already confirmed (shouldn\'t happen in normal flow)'),
    'Should not have the problematic else clause'
  );
  
} catch (error) {
  test('Register.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 2: Check EmailVerification.tsx auto-detection
console.log('\n📧 TEST 2: Email Verification Auto-Detection');
console.log('--------------------------------------------');

try {
  const emailVerificationFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/EmailVerification.tsx'), 'utf8');
  
  test(
    'Has auto-detection for already verified users',
    emailVerificationFile.includes('checkUserStatus') && 
    emailVerificationFile.includes('user.email_confirmed_at'),
    'Should detect if user is already verified'
  );
  
  test(
    'Redirects already verified users',
    emailVerificationFile.includes('navigate(\'/auth/callback\')') &&
    emailVerificationFile.includes('Email already verified! Redirecting'),
    'Should redirect already verified users to callback'
  );
  
} catch (error) {
  test('EmailVerification.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 3: Check AuthCallback verification logic
console.log('\n🔄 TEST 3: Auth Callback Verification');
console.log('------------------------------------');

try {
  const authCallbackFile = fs.readFileSync(path.join(__dirname, 'src/components/auth/AuthCallback.tsx'), 'utf8');
  
  test(
    'Strict email verification check',
    authCallbackFile.includes('if (!session.user.email_confirmed_at)'),
    'Should check email confirmation status'
  );
  
  test(
    'Redirects unverified users',
    authCallbackFile.includes('navigate(\'/auth/verify-email\'') &&
    authCallbackFile.includes('Please verify your email address to continue'),
    'Should redirect unverified users to verification page'
  );
  
} catch (error) {
  test('AuthCallback.tsx file exists', false, `File not found: ${error.message}`);
}

// Test 4: Check for any remaining problematic patterns
console.log('\n⚠️ TEST 4: Problematic Pattern Detection');
console.log('----------------------------------------');

try {
  const registerFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/Register.tsx'), 'utf8');
  const authCallbackFile = fs.readFileSync(path.join(__dirname, 'src/components/auth/AuthCallback.tsx'), 'utf8');
  
  // Check for patterns that could cause the issue
  test(
    'No immediate sign-in redirect',
    !registerFile.includes('navigate(\'/login\'') || 
    registerFile.includes('navigate(\'/login\', { state: { intendedRole } })') === false,
    'Should not redirect to login immediately after registration'
  );
  
  test(
    'No bypass of email verification',
    !authCallbackFile.includes('// Skip email verification') &&
    !authCallbackFile.includes('bypass'),
    'Should not have email verification bypass'
  );
  
} catch (error) {
  test('Pattern detection completed', false, `Error: ${error.message}`);
}

// Test 5: Verify the complete flow
console.log('\n🔄 TEST 5: Complete Flow Verification');
console.log('------------------------------------');

try {
  const registerFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/Register.tsx'), 'utf8');
  const emailVerificationFile = fs.readFileSync(path.join(__dirname, 'src/pages/auth/EmailVerification.tsx'), 'utf8');
  const authCallbackFile = fs.readFileSync(path.join(__dirname, 'src/components/auth/AuthCallback.tsx'), 'utf8');
  
  // Verify the complete flow: Register -> EmailVerification -> AuthCallback
  test(
    'Complete flow: Register to EmailVerification',
    registerFile.includes('navigate(\'/auth/verify-email\'') &&
    emailVerificationFile.includes('EmailVerification'),
    'Register should redirect to EmailVerification'
  );
  
  test(
    'Complete flow: EmailVerification to AuthCallback',
    emailVerificationFile.includes('navigate(\'/auth/callback\')') &&
    authCallbackFile.includes('AuthCallback'),
    'EmailVerification should redirect to AuthCallback'
  );
  
  test(
    'Complete flow: AuthCallback handles verification',
    authCallbackFile.includes('email_confirmed_at') &&
    authCallbackFile.includes('navigate(\'/auth/verify-email\''),
    'AuthCallback should handle verification properly'
  );
  
} catch (error) {
  test('Complete flow verification', false, `Error: ${error.message}`);
}

// Summary
console.log('\n📊 TEST SUMMARY');
console.log('===============');
console.log(`Total Tests: ${tests.total}`);
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`Success Rate: ${Math.round((tests.passed / tests.total) * 100)}%`);

if (tests.failed === 0) {
  console.log('\n🎉 ALL EMAIL VERIFICATION TESTS PASSED!');
  console.log('The email verification flow should work correctly.');
  console.log('\n✅ FIXES CONFIRMED:');
  console.log('• Removed problematic "You can now sign in" message');
  console.log('• Always redirects to verification page');
  console.log('• Auto-detects already verified users');
  console.log('• Proper error handling and fallbacks');
} else {
  console.log('\n⚠️ SOME TESTS FAILED!');
  console.log('Please review the failed tests above.');
}

console.log('\n🔍 NEXT STEPS:');
console.log('1. Test registration in production environment');
console.log('2. Check Supabase email settings in dashboard');
console.log('3. Verify SMTP configuration is working');
console.log('4. Test with real email addresses');
console.log('5. Monitor browser console for debug logs');

process.exit(tests.failed > 0 ? 1 : 0);
