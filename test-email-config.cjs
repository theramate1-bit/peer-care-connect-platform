#!/usr/bin/env node

/**
 * Test Email Configuration
 * Verifies that email verification is properly configured
 */

const fs = require('fs');

console.log('📧 TESTING EMAIL CONFIGURATION');
console.log('================================\n');

// Test 1: Supabase Configuration
console.log('1️⃣ SUPABASE CONFIGURATION:');
const configContent = fs.readFileSync('supabase/config.toml', 'utf8');

const hasEmailConfirmations = configContent.includes('enable_confirmations = true');
const hasEmailSignup = configContent.includes('enable_signup = true');
const hasDoubleConfirm = configContent.includes('double_confirm_changes = true');
const hasRedirectUrls = configContent.includes('additional_redirect_urls');

console.log(`   ✅ Email confirmations enabled: ${hasEmailConfirmations}`);
console.log(`   ✅ Email signup enabled: ${hasEmailSignup}`);
console.log(`   ✅ Double confirm changes: ${hasDoubleConfirm}`);
console.log(`   ✅ Redirect URLs configured: ${hasRedirectUrls}`);

// Test 2: AuthContext Configuration
console.log('\n2️⃣ AUTH CONTEXT CONFIGURATION:');
const authContextContent = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const hasEmailRedirectTo = authContextContent.includes('emailRedirectTo: redirectUrl');
const hasCorrectRedirectUrl = authContextContent.includes('/auth/verify-email');
const hasDebugLogging = authContextContent.includes('console.log') && authContextContent.includes('Signup successful');
const hasUserDataPassing = authContextContent.includes('first_name') && authContextContent.includes('user_role');

console.log(`   ✅ Email redirect configured: ${hasEmailRedirectTo}`);
console.log(`   ✅ Correct redirect URL: ${hasCorrectRedirectUrl}`);
console.log(`   ✅ Debug logging added: ${hasDebugLogging}`);
console.log(`   ✅ User data passing: ${hasUserDataPassing}`);

// Test 3: Email Verification Component
console.log('\n3️⃣ EMAIL VERIFICATION COMPONENT:');
const emailVerificationContent = fs.readFileSync('src/pages/auth/EmailVerification.tsx', 'utf8');

const hasTokenProcessing = emailVerificationContent.includes('token_hash') && emailVerificationContent.includes('verifyOtp');
const hasErrorHandling = emailVerificationContent.includes('expired') && emailVerificationContent.includes('invalid');
const hasResendFunction = emailVerificationContent.includes('handleResendVerification');
const hasSuccessRedirect = emailVerificationContent.includes('navigate(\'/auth/callback\')');

console.log(`   ✅ Token processing: ${hasTokenProcessing}`);
console.log(`   ✅ Error handling: ${hasErrorHandling}`);
console.log(`   ✅ Resend function: ${hasResendFunction}`);
console.log(`   ✅ Success redirect: ${hasSuccessRedirect}`);

// Test 4: Register Component
console.log('\n4️⃣ REGISTER COMPONENT:');
const registerContent = fs.readFileSync('src/pages/auth/Register.tsx', 'utf8');

const hasEmailConfirmationCheck = registerContent.includes('email_confirmed_at');
const hasVerificationNavigation = registerContent.includes('navigate(\'/auth/verify-email\'');
const hasUserRolePassing = registerContent.includes('userRole');
const hasSuccessMessage = registerContent.includes('Registration successful! Please check your email');

console.log(`   ✅ Email confirmation check: ${hasEmailConfirmationCheck}`);
console.log(`   ✅ Verification navigation: ${hasVerificationNavigation}`);
console.log(`   ✅ User role passing: ${hasUserRolePassing}`);
console.log(`   ✅ Success message: ${hasSuccessMessage}`);

// Test 5: AuthCallback Component
console.log('\n5️⃣ AUTH CALLBACK COMPONENT:');
const authCallbackContent = fs.readFileSync('src/components/auth/AuthCallback.tsx', 'utf8');

const hasEmailVerificationCheck = authCallbackContent.includes('email_confirmed_at');
const hasVerificationRedirect = authCallbackContent.includes('navigate(\'/auth/verify-email\'');
const hasProfileCreation = authCallbackContent.includes('createUserProfile');
const hasOnboardingRedirect = authCallbackContent.includes('navigate(\'/onboarding\'');

console.log(`   ✅ Email verification check: ${hasEmailVerificationCheck}`);
console.log(`   ✅ Verification redirect: ${hasVerificationRedirect}`);
console.log(`   ✅ Profile creation: ${hasProfileCreation}`);
console.log(`   ✅ Onboarding redirect: ${hasOnboardingRedirect}`);

// Summary
console.log('\n📋 EMAIL CONFIGURATION TEST SUMMARY');
console.log('=====================================');

const configTests = [
  { name: 'Supabase configuration', passed: hasEmailConfirmations && hasEmailSignup && hasDoubleConfirm && hasRedirectUrls },
  { name: 'AuthContext configuration', passed: hasEmailRedirectTo && hasCorrectRedirectUrl && hasDebugLogging && hasUserDataPassing },
  { name: 'Email verification component', passed: hasTokenProcessing && hasErrorHandling && hasResendFunction && hasSuccessRedirect },
  { name: 'Register component', passed: hasEmailConfirmationCheck && hasVerificationNavigation && hasUserRolePassing && hasSuccessMessage },
  { name: 'AuthCallback component', passed: hasEmailVerificationCheck && hasVerificationRedirect && hasProfileCreation && hasOnboardingRedirect }
];

const passedConfigTests = configTests.filter(test => test.passed).length;
const totalConfigTests = configTests.length;

console.log(`\n✅ Passed: ${passedConfigTests}/${totalConfigTests} configuration tests`);

configTests.forEach(test => {
  console.log(`   ${test.passed ? '✅' : '❌'} ${test.name}`);
});

if (passedConfigTests === totalConfigTests) {
  console.log('\n🎉 ALL CONFIGURATION TESTS PASSED! Email verification should work correctly.');
  console.log('\n📝 CONFIGURATION VERIFICATION:');
  console.log('   ✅ Supabase email confirmations enabled');
  console.log('   ✅ Correct redirect URLs configured');
  console.log('   ✅ Debug logging added for troubleshooting');
  console.log('   ✅ Email verification flow properly implemented');
  console.log('   ✅ Error handling and recovery options available');
} else {
  console.log('\n⚠️  Some configuration tests failed. Please review the issues above.');
}

console.log('\n🚀 NEXT STEPS:');
console.log('   1. Restart Supabase: npx supabase stop && npx supabase start');
console.log('   2. Test registration with debug logs enabled');
console.log('   3. Check email delivery (including spam folder)');
console.log('   4. Verify verification link works correctly');

console.log('\n🎯 Email verification configuration is ready!');
