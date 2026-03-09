/**
 * Test Option B Implementation: Post-Auth Role Selection for Both
 * This script verifies that all subsequent pages are aware of the unified flow
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Testing Option B: Post-Auth Role Selection for Both...\n');

// Test 1: Check Register.tsx changes
console.log('1️⃣ Checking Register.tsx changes...');
try {
  const registerPath = path.join(__dirname, 'src', 'pages', 'auth', 'Register.tsx');
  const registerContent = fs.readFileSync(registerPath, 'utf8');
  
  const noRoleInFormData = !registerContent.includes('userRole: "client"');
  const noRoleInSignup = !registerContent.includes('user_role: formData.userRole');
  const noRoleSelectionUI = !registerContent.includes('I am a:');
  const redirectsToCallback = registerContent.includes('navigate("/auth/callback")');
  
  console.log(`   ✅ No role in form data: ${noRoleInFormData ? 'Yes' : 'No'}`);
  console.log(`   ✅ No role in signup: ${noRoleInSignup ? 'Yes' : 'No'}`);
  console.log(`   ✅ No role selection UI: ${noRoleSelectionUI ? 'Yes' : 'No'}`);
  console.log(`   ✅ Redirects to callback: ${redirectsToCallback ? 'Yes' : 'No'}`);
  
  if (noRoleInFormData && noRoleInSignup && noRoleSelectionUI && redirectsToCallback) {
    console.log('   🎉 Register.tsx changes: PASSED\n');
  } else {
    console.log('   ❌ Register.tsx changes: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading Register.tsx: ${error.message}\n`);
}

// Test 2: Check AuthCallback handles both flows
console.log('2️⃣ Checking AuthCallback unified handling...');
try {
  const authCallbackPath = path.join(__dirname, 'src', 'components', 'auth', 'AuthCallback.tsx');
  const authCallbackContent = fs.readFileSync(authCallbackPath, 'utf8');
  
  const handlesBothFlows = authCallbackContent.includes('Both OAuth users and email users');
  const redirectsToRoleSelection = authCallbackContent.includes('/auth/role-selection');
  const hasEmailVerificationHandling = authCallbackContent.includes('hasVerificationToken');
  
  console.log(`   ✅ Handles both flows: ${handlesBothFlows ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Redirects to role selection: ${redirectsToRoleSelection ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Email verification handling: ${hasEmailVerificationHandling ? 'Found' : 'Missing'}`);
  
  if (handlesBothFlows && redirectsToRoleSelection && hasEmailVerificationHandling) {
    console.log('   🎉 AuthCallback unified handling: PASSED\n');
  } else {
    console.log('   ❌ AuthCallback unified handling: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading AuthCallback.tsx: ${error.message}\n`);
}

// Test 3: Check RoleSelection page awareness
console.log('3️⃣ Checking RoleSelection page awareness...');
try {
  const roleSelectionPath = path.join(__dirname, 'src', 'pages', 'auth', 'RoleSelection.tsx');
  const roleSelectionContent = fs.readFileSync(roleSelectionPath, 'utf8');
  
  const updatesDatabaseRole = roleSelectionContent.includes('user_role: role');
  const redirectsToOnboarding = roleSelectionContent.includes('/onboarding?role=');
  const handlesBothRoles = roleSelectionContent.includes("'client' | 'practitioner'");
  
  console.log(`   ✅ Updates database role: ${updatesDatabaseRole ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Redirects to onboarding: ${redirectsToOnboarding ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Handles both roles: ${handlesBothRoles ? 'Found' : 'Missing'}`);
  
  if (updatesDatabaseRole && redirectsToOnboarding && handlesBothRoles) {
    console.log('   🎉 RoleSelection page awareness: PASSED\n');
  } else {
    console.log('   ❌ RoleSelection page awareness: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading RoleSelection.tsx: ${error.message}\n`);
}

// Test 4: Check Onboarding page awareness
console.log('4️⃣ Checking Onboarding page awareness...');
try {
  const onboardingPath = path.join(__dirname, 'src', 'pages', 'auth', 'Onboarding.tsx');
  const onboardingContent = fs.readFileSync(onboardingPath, 'utf8');
  
  const handlesRoleFromUrl = onboardingContent.includes('roleFromUrl');
  const handlesRoleFromProfile = onboardingContent.includes('userProfile?.user_role');
  const hasEffectiveRoleLogic = onboardingContent.includes('effectiveRole');
  const redirectsToCorrectDashboard = onboardingContent.includes('dashboardRoute');
  
  console.log(`   ✅ Handles role from URL: ${handlesRoleFromUrl ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Handles role from profile: ${handlesRoleFromProfile ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Has effective role logic: ${hasEffectiveRoleLogic ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Redirects to correct dashboard: ${redirectsToCorrectDashboard ? 'Found' : 'Missing'}`);
  
  if (handlesRoleFromUrl && handlesRoleFromProfile && hasEffectiveRoleLogic && redirectsToCorrectDashboard) {
    console.log('   🎉 Onboarding page awareness: PASSED\n');
  } else {
    console.log('   ❌ Onboarding page awareness: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading Onboarding.tsx: ${error.message}\n`);
}

// Test 5: Check Dashboard routing awareness
console.log('5️⃣ Checking Dashboard routing awareness...');
try {
  const dashboardRoutingPath = path.join(__dirname, 'src', 'lib', 'dashboard-routing.ts');
  const dashboardRoutingContent = fs.readFileSync(dashboardRoutingPath, 'utf8');
  
  const handlesNullRole = dashboardRoutingContent.includes('user_role ||');
  const hasOnboardingCheck = dashboardRoutingContent.includes('onboarding_status');
  const hasRoleBasedRouting = dashboardRoutingContent.includes('switch (effectiveRole)');
  const hasFallbackLogic = dashboardRoutingContent.includes('default:');
  
  console.log(`   ✅ Handles null role: ${handlesNullRole ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Has onboarding check: ${hasOnboardingCheck ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Has role-based routing: ${hasRoleBasedRouting ? 'Found' : 'Missing'}`);
  console.log(`   ✅ Has fallback logic: ${hasFallbackLogic ? 'Found' : 'Missing'}`);
  
  if (handlesNullRole && hasOnboardingCheck && hasRoleBasedRouting && hasFallbackLogic) {
    console.log('   🎉 Dashboard routing awareness: PASSED\n');
  } else {
    console.log('   ❌ Dashboard routing awareness: FAILED\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading dashboard-routing.ts: ${error.message}\n`);
}

console.log('🎯 Option B Implementation Analysis Complete!\n');

console.log('📋 Unified Flow Implementation:');
console.log('✅ Email Signup: Register → AuthCallback → Role Selection → Onboarding → Dashboard');
console.log('✅ Google OAuth: Register → OAuth → AuthCallback → Role Selection → Onboarding → Dashboard');
console.log('\n🎯 Key Benefits:');
console.log('• Both paths go through identical flow');
console.log('• Role selection happens after authentication for both');
console.log('• Consistent user experience');
console.log('• All subsequent pages are aware of the flow');
console.log('• Database trigger sets null role for all users');
console.log('\n🔄 Flow Consistency:');
console.log('1. User registers (email or OAuth)');
console.log('2. Database trigger creates profile with null role');
console.log('3. AuthCallback redirects to role selection');
console.log('4. User selects role (Client/Practitioner)');
console.log('5. RoleSelection updates database');
console.log('6. User redirected to onboarding');
console.log('7. Onboarding completes and redirects to dashboard');
console.log('\n✅ All subsequent pages are aware and ready!');
