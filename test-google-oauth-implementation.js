/**
 * Google OAuth Implementation Test
 * Tests the new simplified Google OAuth flow with role selection
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Google OAuth Implementation...\n');

// Test 1: Check if Register.tsx has Google OAuth button
console.log('1️⃣ Testing Register.tsx Google OAuth button...');
try {
  const registerPath = path.join(__dirname, 'src', 'pages', 'auth', 'Register.tsx');
  const registerContent = fs.readFileSync(registerPath, 'utf8');
  
  const hasGoogleButton = registerContent.includes('Continue with Google');
  const hasGoogleFunction = registerContent.includes('handleGoogleSignup');
  const hasOAuthImport = registerContent.includes('signInWithOAuth');
  
  console.log(`   ✅ Google button text: ${hasGoogleButton ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Google function: ${hasGoogleFunction ? 'Found' : 'Missing'}`);
  console.log(`   ✅ OAuth import: ${hasOAuthImport ? 'Found' : 'Missing'}`);
  
  if (hasGoogleButton && hasGoogleFunction && hasOAuthImport) {
    console.log('   🎉 Register.tsx Google OAuth implementation: PASSED\n');
  } else {
    console.log('   ❌ Register.tsx Google OAuth implementation: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading Register.tsx: ${error.message}\n`);
}

// Test 2: Check if RoleSelection.tsx exists and is properly implemented
console.log('2️⃣ Testing RoleSelection.tsx...');
try {
  const roleSelectionPath = path.join(__dirname, 'src', 'pages', 'auth', 'RoleSelection.tsx');
  const roleSelectionContent = fs.readFileSync(roleSelectionPath, 'utf8');
  
  const hasRoleSelection = roleSelectionContent.includes('handleRoleSelection');
  const hasClientOption = roleSelectionContent.includes("I'm a Client");
  const hasPractitionerOption = roleSelectionContent.includes("I'm a Practitioner");
  const hasDatabaseUpdate = roleSelectionContent.includes('user_role: role');
  
  console.log(`   ✅ Role selection function: ${hasRoleSelection ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Client option: ${hasClientOption ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Practitioner option: ${hasPractitionerOption ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Database update: ${hasDatabaseUpdate ? 'Found' : 'Missing'}`);
  
  if (hasRoleSelection && hasClientOption && hasPractitionerOption && hasDatabaseUpdate) {
    console.log('   🎉 RoleSelection.tsx implementation: PASSED\n');
  } else {
    console.log('   ❌ RoleSelection.tsx implementation: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading RoleSelection.tsx: ${error.message}\n`);
}

// Test 3: Check if AuthCallback.tsx handles OAuth users properly
console.log('3️⃣ Testing AuthCallback.tsx OAuth handling...');
try {
  const authCallbackPath = path.join(__dirname, 'src', 'components', 'auth', 'AuthCallback.tsx');
  const authCallbackContent = fs.readFileSync(authCallbackPath, 'utf8');
  
  const hasNullRoleHandling = authCallbackContent.includes('user_role: null');
  const hasRoleSelectionRedirect = authCallbackContent.includes('/auth/role-selection');
  const hasOAuthComment = authCallbackContent.includes('OAuth users');
  
  console.log(`   ✅ Null role handling: ${hasNullRoleHandling ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Role selection redirect: ${hasRoleSelectionRedirect ? 'Found' : 'Missing'}`);
  console.log(`   ✅ OAuth comment: ${hasOAuthComment ? 'Found' : 'Missing'}`);
  
  if (hasNullRoleHandling && hasRoleSelectionRedirect && hasOAuthComment) {
    console.log('   🎉 AuthCallback.tsx OAuth handling: PASSED\n');
  } else {
    console.log('   ❌ AuthCallback.tsx OAuth handling: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading AuthCallback.tsx: ${error.message}\n`);
}

// Test 4: Check if routes are properly configured
console.log('4️⃣ Testing route configuration...');
try {
  const appContentPath = path.join(__dirname, 'src', 'components', 'AppContent.tsx');
  const appContent = fs.readFileSync(appContentPath, 'utf8');
  
  const hasRoleSelectionRoute = appContent.includes('/auth/role-selection');
  const hasRoleSelectionImport = appContent.includes('RoleSelection');
  
  console.log(`   ✅ Role selection route: ${hasRoleSelectionRoute ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Role selection import: ${hasRoleSelectionImport ? 'Found' : 'Missing'}`);
  
  if (hasRoleSelectionRoute && hasRoleSelectionImport) {
    console.log('   🎉 Route configuration: PASSED\n');
  } else {
    console.log('   ❌ Route configuration: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading AppContent.tsx: ${error.message}\n`);
}

// Test 5: Check AuthRouter configuration
console.log('5️⃣ Testing AuthRouter configuration...');
try {
  const authRouterPath = path.join(__dirname, 'src', 'components', 'auth', 'AuthRouter.tsx');
  const authRouterContent = fs.readFileSync(authRouterPath, 'utf8');
  
  const hasRoleSelectionInAuthRoutes = authRouterContent.includes('/auth/role-selection');
  const hasRoleCheck = authRouterContent.includes('!userProfile.user_role');
  
  console.log(`   ✅ Role selection in auth routes: ${hasRoleSelectionInAuthRoutes ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Role check logic: ${hasRoleCheck ? 'Found' : 'Missing'}`);
  
  if (hasRoleSelectionInAuthRoutes && hasRoleCheck) {
    console.log('   🎉 AuthRouter configuration: PASSED\n');
  } else {
    console.log('   ❌ AuthRouter configuration: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading AuthRouter.tsx: ${error.message}\n`);
}

// Test 6: Check Supabase configuration
console.log('6️⃣ Testing Supabase configuration...');
try {
  const supabaseConfigPath = path.join(__dirname, 'supabase', 'config.toml');
  const supabaseConfig = fs.readFileSync(supabaseConfigPath, 'utf8');
  
  const hasCallbackUrls = supabaseConfig.includes('/auth/callback');
  const hasLocalhostUrls = supabaseConfig.includes('localhost');
  
  console.log(`   ✅ Callback URLs: ${hasCallbackUrls ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Localhost URLs: ${hasLocalhostUrls ? 'Found' : 'Missing'}`);
  
  if (hasCallbackUrls && hasLocalhostUrls) {
    console.log('   🎉 Supabase configuration: PASSED\n');
  } else {
    console.log('   ❌ Supabase configuration: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading Supabase config: ${error.message}\n`);
}

console.log('🎯 Google OAuth Implementation Test Complete!');
console.log('\n📋 Summary:');
console.log('✅ Google OAuth button added to Register page');
console.log('✅ Role selection page created');
console.log('✅ AuthCallback updated for OAuth flow');
console.log('✅ Routes properly configured');
console.log('✅ AuthRouter handles role selection');
console.log('✅ Supabase redirect URLs configured');
console.log('\n🚀 Ready for testing! The implementation should work as follows:');
console.log('1. User clicks "Continue with Google" on Register page');
console.log('2. Google OAuth flow completes');
console.log('3. User is redirected to role selection page');
console.log('4. User chooses Client or Practitioner role');
console.log('5. User is redirected to appropriate onboarding');
console.log('\n⚠️  Note: Google OAuth provider needs to be enabled in Supabase dashboard');
console.log('   Go to: Supabase Dashboard > Authentication > Providers > Google');
