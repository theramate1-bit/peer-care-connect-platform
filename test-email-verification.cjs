const fs = require('fs');

console.log('🧪 TESTING EMAIL VERIFICATION SETUP');
console.log('====================================\n');

// Test 1: Supabase Configuration
console.log('📋 1. SUPABASE CONFIGURATION');
console.log('-----------------------------');

const configFile = fs.readFileSync('./supabase/config.toml', 'utf8');
const clientFile = fs.readFileSync('./src/integrations/supabase/client.ts', 'utf8');

const hasEmailConfirmations = configFile.includes('enable_confirmations = true');
const hasSignupEnabled = configFile.includes('enable_signup = true');
const hasRemoteUrl = clientFile.includes('aikqnvltuwwgifuocvto.supabase.co');
const hasRedirectUrls = configFile.includes('auth/verify-email');

console.log(`✅ Email confirmations enabled: ${hasEmailConfirmations ? 'YES' : 'NO'}`);
console.log(`✅ Signup enabled: ${hasSignupEnabled ? 'YES' : 'NO'}`);
console.log(`✅ Remote Supabase URL: ${hasRemoteUrl ? 'YES' : 'NO'}`);
console.log(`✅ Redirect URLs configured: ${hasRedirectUrls ? 'YES' : 'NO'}`);

// Test 2: AuthContext Signup Function
console.log('\n📋 2. AUTH CONTEXT SIGNUP');
console.log('-------------------------');

const authContextFile = fs.readFileSync('./src/contexts/AuthContext.tsx', 'utf8');

const hasSignUpFunction = authContextFile.includes('signUp = async');
const hasEmailRedirectTo = authContextFile.includes('emailRedirectTo');
const hasUserMetadata = authContextFile.includes('user_metadata');
const hasDebugLogging = authContextFile.includes('console.log');

console.log(`✅ SignUp function exists: ${hasSignUpFunction ? 'YES' : 'NO'}`);
console.log(`✅ Email redirect configured: ${hasEmailRedirectTo ? 'YES' : 'NO'}`);
console.log(`✅ User metadata included: ${hasUserMetadata ? 'YES' : 'NO'}`);
console.log(`✅ Debug logging enabled: ${hasDebugLogging ? 'YES' : 'NO'}`);

// Test 3: Register Component
console.log('\n📋 3. REGISTER COMPONENT');
console.log('------------------------');

const registerFile = fs.readFileSync('./src/pages/auth/Register.tsx', 'utf8');

const hasSignUpCall = registerFile.includes('signUp(');
const hasEmailVerificationCheck = registerFile.includes('email_confirmed_at');
const hasNavigationToVerification = registerFile.includes('/auth/verify-email');

console.log(`✅ SignUp call in register: ${hasSignUpCall ? 'YES' : 'NO'}`);
console.log(`✅ Email verification check: ${hasEmailVerificationCheck ? 'YES' : 'NO'}`);
console.log(`✅ Navigation to verification: ${hasNavigationToVerification ? 'YES' : 'NO'}`);

// Test 4: Email Verification Component
console.log('\n📋 4. EMAIL VERIFICATION COMPONENT');
console.log('-----------------------------------');

const emailVerificationFile = fs.readFileSync('./src/pages/auth/EmailVerification.tsx', 'utf8');

const hasVerifyOtp = emailVerificationFile.includes('verifyOtp');
const hasResendVerification = emailVerificationFile.includes('resend');
const hasTokenProcessing = emailVerificationFile.includes('token');

console.log(`✅ OTP verification: ${hasVerifyOtp ? 'YES' : 'NO'}`);
console.log(`✅ Resend verification: ${hasResendVerification ? 'YES' : 'NO'}`);
console.log(`✅ Token processing: ${hasTokenProcessing ? 'YES' : 'NO'}`);

// Test 5: Potential Issues
console.log('\n📋 5. POTENTIAL ISSUES');
console.log('-----------------------');

const issues = [];

if (!hasEmailConfirmations) {
  issues.push('❌ Email confirmations disabled in config');
}

if (!hasRemoteUrl) {
  issues.push('❌ Using local Supabase instead of remote');
}

if (!hasRedirectUrls) {
  issues.push('❌ Missing redirect URLs for email verification');
}

if (issues.length === 0) {
  console.log('✅ No obvious configuration issues found');
} else {
  issues.forEach(issue => console.log(issue));
}

// Summary
console.log('\n📊 SUMMARY');
console.log('===========');

const totalChecks = 12;
const passedChecks = [
  hasEmailConfirmations, hasSignupEnabled, hasRemoteUrl, hasRedirectUrls,
  hasSignUpFunction, hasEmailRedirectTo, hasUserMetadata, hasDebugLogging,
  hasSignUpCall, hasEmailVerificationCheck, hasNavigationToVerification,
  hasVerifyOtp, hasResendVerification, hasTokenProcessing
].filter(Boolean).length;

const percentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`✅ Checks Passed: ${passedChecks}/${totalChecks} (${percentage}%)`);

if (percentage >= 90) {
  console.log('🎉 Configuration looks good!');
  console.log('\n🔍 NEXT STEPS:');
  console.log('1. Check Supabase Dashboard → Authentication → Settings');
  console.log('2. Verify SMTP configuration is set up');
  console.log('3. Check spam/junk folder for verification emails');
  console.log('4. Test with a different email address');
} else if (percentage >= 70) {
  console.log('⚠️  Some configuration issues detected');
} else {
  console.log('❌ Significant configuration issues found');
}

console.log('\n🚨 COMMON SOLUTIONS:');
console.log('• Check Supabase Dashboard → Authentication → Email Templates');
console.log('• Verify SMTP settings in Supabase Dashboard');
console.log('• Check spam/junk email folder');
console.log('• Try with a different email provider (Gmail, Outlook, etc.)');
console.log('• Verify redirect URLs are whitelisted in Supabase');
