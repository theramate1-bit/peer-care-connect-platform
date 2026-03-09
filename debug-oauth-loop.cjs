/**
 * Debug OAuth Authentication Loop
 * This script helps debug why the OAuth user is stuck in an authentication loop
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging OAuth Authentication Loop...\n');

// Check if the user profile exists in the database
console.log('1️⃣ Checking database trigger function...');
try {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250125000002_unify_registration_flow.sql');
  if (fs.existsSync(migrationPath)) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const setsNullRole = migrationContent.includes('NULL, -- Force NULL role');
    console.log(`   ✅ Migration sets NULL role: ${setsNullRole ? 'Yes' : 'No'}`);
  } else {
    console.log('   ⚠️ Migration file not found locally, but may be applied remotely');
  }
} catch (error) {
  console.log(`   ❌ Error reading migration: ${error.message}`);
}

// Check AuthCallback component
console.log('\n2️⃣ Checking AuthCallback component...');
try {
  const authCallbackPath = path.join(__dirname, 'src', 'components', 'auth', 'AuthCallback.tsx');
  const authCallbackContent = fs.readFileSync(authCallbackPath, 'utf8');
  
  const hasDebugLogging = authCallbackContent.includes('console.log');
  const hasProcessingState = authCallbackContent.includes('setIsProcessing(false)');
  const handlesNullRole = authCallbackContent.includes('!finalProfile.user_role');
  
  console.log(`   ✅ Has debug logging: ${hasDebugLogging ? 'Yes' : 'No'}`);
  console.log(`   ✅ Has processing state fix: ${hasProcessingState ? 'Yes' : 'No'}`);
  console.log(`   ✅ Handles null role: ${handlesNullRole ? 'Yes' : 'No'}`);
  
  if (hasDebugLogging && hasProcessingState && handlesNullRole) {
    console.log('   🎉 AuthCallback looks good\n');
  } else {
    console.log('   ❌ AuthCallback needs fixes\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading AuthCallback: ${error.message}`);
}

// Check RoleSelection component
console.log('3️⃣ Checking RoleSelection component...');
try {
  const roleSelectionPath = path.join(__dirname, 'src', 'pages', 'auth', 'RoleSelection.tsx');
  const roleSelectionContent = fs.readFileSync(roleSelectionPath, 'utf8');
  
  const updatesDatabase = roleSelectionContent.includes('user_role: role');
  const redirectsToOnboarding = roleSelectionContent.includes('/onboarding?role=');
  
  console.log(`   ✅ Updates database: ${updatesDatabase ? 'Yes' : 'No'}`);
  console.log(`   ✅ Redirects to onboarding: ${redirectsToOnboarding ? 'Yes' : 'No'}`);
  
  if (updatesDatabase && redirectsToOnboarding) {
    console.log('   🎉 RoleSelection looks good\n');
  } else {
    console.log('   ❌ RoleSelection needs fixes\n');
  }
} catch (error) {
  console.log(`   ❌ Error reading RoleSelection: ${error.message}`);
}

console.log('🎯 Debug Analysis Complete!\n');

console.log('📋 Expected OAuth Flow:');
console.log('1. User clicks "Continue with Google"');
console.log('2. Google OAuth redirects to /auth/callback');
console.log('3. AuthCallback checks user profile');
console.log('4. Database trigger should have created profile with NULL role');
console.log('5. AuthCallback redirects to /auth/role-selection');
console.log('6. User selects role (Client/Practitioner)');
console.log('7. RoleSelection updates database with role');
console.log('8. Redirect to /onboarding?role=[selected]');
console.log('9. Onboarding completes and redirects to dashboard\n');

console.log('🔍 Debug Steps for User:');
console.log('1. Open browser dev tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Try the OAuth flow again');
console.log('4. Look for these debug messages:');
console.log('   - "🔍 AuthCallback: User authenticated:"');
console.log('   - "🔍 AuthCallback: Profile check result:"');
console.log('   - "🔍 AuthCallback: Checking role:"');
console.log('   - "🔍 AuthCallback: Redirecting to role selection"');
console.log('5. Check Network tab for any failed API calls');
console.log('6. Check if user profile exists in database\n');

console.log('🚨 Common Issues:');
console.log('• Database trigger not creating profile');
console.log('• Profile created but with wrong role');
console.log('• AuthCallback stuck in loading state');
console.log('• RoleSelection not updating database');
console.log('• Infinite redirect loop between components\n');

console.log('💡 Quick Fixes to Try:');
console.log('1. Clear browser cache and cookies');
console.log('2. Try incognito/private browsing');
console.log('3. Check Supabase dashboard for user profile');
console.log('4. Manually set user role in database if needed');
console.log('5. Check browser console for JavaScript errors');
