#!/usr/bin/env node

/**
 * Google OAuth Flow Implementation Verification Script
 * This script verifies that the Google OAuth flow is properly implemented
 */

const { readFileSync, existsSync } = require('fs');
const { join, dirname } = require('path');

const __dirname = dirname(__filename);

console.log('🔍 Google OAuth Flow Implementation Verification');
console.log('=' .repeat(60));

// Test results
const testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

function runTest(testName, testFunction) {
    testResults.total++;
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
        const result = testFunction();
        if (result) {
            console.log(`✅ PASS: ${testName}`);
            testResults.passed++;
        } else {
            console.log(`❌ FAIL: ${testName}`);
            testResults.failed++;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${testName} - ${error.message}`);
        testResults.failed++;
    }
}

// Test 1: Verify Register.tsx has dual Google OAuth buttons
function testRegisterDualButtons() {
    const registerPath = join(__dirname, 'src', 'pages', 'auth', 'Register.tsx');
    
    if (!existsSync(registerPath)) {
        console.log('❌ Register.tsx not found');
        return false;
    }
    
    const content = readFileSync(registerPath, 'utf8');
    
    // Check for client button
    const hasClientButton = content.includes('Continue with Google as Client');
    const hasClientSessionStorage = content.includes("sessionStorage.setItem('intendedRole', 'client')");
    
    // Check for practitioner button
    const hasPractitionerButton = content.includes('Continue with Google as Practitioner');
    const hasPractitionerSessionStorage = content.includes("sessionStorage.setItem('intendedRole', 'practitioner')");
    
    console.log(`  - Client button: ${hasClientButton ? '✅' : '❌'}`);
    console.log(`  - Client session storage: ${hasClientSessionStorage ? '✅' : '❌'}`);
    console.log(`  - Practitioner button: ${hasPractitionerButton ? '✅' : '❌'}`);
    console.log(`  - Practitioner session storage: ${hasPractitionerSessionStorage ? '✅' : '❌'}`);
    
    return hasClientButton && hasClientSessionStorage && hasPractitionerButton && hasPractitionerSessionStorage;
}

// Test 2: Verify Login.tsx has dual Google OAuth buttons
function testLoginDualButtons() {
    const loginPath = join(__dirname, 'src', 'pages', 'auth', 'Login.tsx');
    
    if (!existsSync(loginPath)) {
        console.log('❌ Login.tsx not found');
        return false;
    }
    
    const content = readFileSync(loginPath, 'utf8');
    
    // Check for client button
    const hasClientButton = content.includes('Continue with Google as Client');
    const hasClientSessionStorage = content.includes("sessionStorage.setItem('intendedRole', 'client')");
    
    // Check for practitioner button
    const hasPractitionerButton = content.includes('Continue with Google as Practitioner');
    const hasPractitionerSessionStorage = content.includes("sessionStorage.setItem('intendedRole', 'practitioner')");
    
    console.log(`  - Client button: ${hasClientButton ? '✅' : '❌'}`);
    console.log(`  - Client session storage: ${hasClientSessionStorage ? '✅' : '❌'}`);
    console.log(`  - Practitioner button: ${hasPractitionerButton ? '✅' : '❌'}`);
    console.log(`  - Practitioner session storage: ${hasPractitionerSessionStorage ? '✅' : '❌'}`);
    
    return hasClientButton && hasClientSessionStorage && hasPractitionerButton && hasPractitionerSessionStorage;
}

// Test 3: Verify AuthCallback.tsx handles intended roles
function testAuthCallbackRoleHandling() {
    const authCallbackPath = join(__dirname, 'src', 'components', 'auth', 'AuthCallback.tsx');
    
    if (!existsSync(authCallbackPath)) {
        console.log('❌ AuthCallback.tsx not found');
        return false;
    }
    
    const content = readFileSync(authCallbackPath, 'utf8');
    
    // Check for intended role handling
    const hasIntendedRoleCheck = content.includes("sessionStorage.getItem('intendedRole')");
    const hasRoleClearing = content.includes("sessionStorage.removeItem('intendedRole')");
    const hasClientRouting = content.includes("intendedRole === 'client'");
    const hasPractitionerRouting = content.includes("intendedRole === 'practitioner'");
    const hasClientOnboardingRedirect = content.includes("navigate('/onboarding'");
    const hasPractitionerRoleSelectionRedirect = content.includes("navigate('/auth/role-selection'");
    
    console.log(`  - Intended role check: ${hasIntendedRoleCheck ? '✅' : '❌'}`);
    console.log(`  - Role clearing: ${hasRoleClearing ? '✅' : '❌'}`);
    console.log(`  - Client routing logic: ${hasClientRouting ? '✅' : '❌'}`);
    console.log(`  - Practitioner routing logic: ${hasPractitionerRouting ? '✅' : '❌'}`);
    console.log(`  - Client onboarding redirect: ${hasClientOnboardingRedirect ? '✅' : '❌'}`);
    console.log(`  - Practitioner role selection redirect: ${hasPractitionerRoleSelectionRedirect ? '✅' : '❌'}`);
    
    return hasIntendedRoleCheck && hasRoleClearing && hasClientRouting && hasPractitionerRouting && 
           hasClientOnboardingRedirect && hasPractitionerRoleSelectionRedirect;
}

// Test 4: Verify RoleSelection.tsx handles practitioner types
function testRoleSelectionHandling() {
    const roleSelectionPath = join(__dirname, 'src', 'pages', 'auth', 'RoleSelection.tsx');
    
    if (!existsSync(roleSelectionPath)) {
        console.log('❌ RoleSelection.tsx not found');
        return false;
    }
    
    const content = readFileSync(roleSelectionPath, 'utf8');
    
    // Check for practitioner role options
    const hasSportsTherapist = content.includes("'sports_therapist'");
    const hasMassageTherapist = content.includes("'massage_therapist'");
    const hasOsteopath = content.includes("'osteopath'");
    const hasClient = content.includes("'client'");
    const hasOnboardingRedirect = content.includes("navigate('/onboarding'");
    
    console.log(`  - Sports therapist option: ${hasSportsTherapist ? '✅' : '❌'}`);
    console.log(`  - Massage therapist option: ${hasMassageTherapist ? '✅' : '❌'}`);
    console.log(`  - Osteopath option: ${hasOsteopath ? '✅' : '❌'}`);
    console.log(`  - Client option: ${hasClient ? '✅' : '❌'}`);
    console.log(`  - Onboarding redirect: ${hasOnboardingRedirect ? '✅' : '❌'}`);
    
    return hasSportsTherapist && hasMassageTherapist && hasOsteopath && hasClient && hasOnboardingRedirect;
}

// Test 5: Verify no generic Google OAuth buttons exist
function testNoGenericButtons() {
    const registerPath = join(__dirname, 'src', 'pages', 'auth', 'Register.tsx');
    const loginPath = join(__dirname, 'src', 'pages', 'auth', 'Login.tsx');
    
    const registerContent = readFileSync(registerPath, 'utf8');
    const loginContent = readFileSync(loginPath, 'utf8');
    
    // Check that generic buttons are removed
    const registerHasGeneric = registerContent.includes('Continue with Google') && 
                              !registerContent.includes('Continue with Google as Client') &&
                              !registerContent.includes('Continue with Google as Practitioner');
    const loginHasGeneric = loginContent.includes('Continue with Google') && 
                           !loginContent.includes('Continue with Google as Client') &&
                           !loginContent.includes('Continue with Google as Practitioner');
    
    console.log(`  - Register generic button removed: ${!registerHasGeneric ? '✅' : '❌'}`);
    console.log(`  - Login generic button removed: ${!loginHasGeneric ? '✅' : '❌'}`);
    
    return !registerHasGeneric && !loginHasGeneric;
}

// Test 6: Verify proper error handling
function testErrorHandling() {
    const authCallbackPath = join(__dirname, 'src', 'components', 'auth', 'AuthCallback.tsx');
    const content = readFileSync(authCallbackPath, 'utf8');
    
    // Check for error handling
    const hasTryCatch = content.includes('try {') && content.includes('} catch');
    const hasErrorLogging = content.includes('console.error');
    const hasToastError = content.includes('toast.error');
    const hasFallbackRouting = content.includes('navigate('/auth/role-selection'");
    
    console.log(`  - Try-catch blocks: ${hasTryCatch ? '✅' : '❌'}`);
    console.log(`  - Error logging: ${hasErrorLogging ? '✅' : '❌'}`);
    console.log(`  - Toast error messages: ${hasToastError ? '✅' : '❌'}`);
    console.log(`  - Fallback routing: ${hasFallbackRouting ? '✅' : '❌'}`);
    
    return hasTryCatch && hasErrorLogging && hasToastError && hasFallbackRouting;
}

// Run all tests
console.log('\n🚀 Starting verification tests...\n');

runTest('Register.tsx Dual Google OAuth Buttons', testRegisterDualButtons);
runTest('Login.tsx Dual Google OAuth Buttons', testLoginDualButtons);
runTest('AuthCallback.tsx Role Handling', testAuthCallbackRoleHandling);
runTest('RoleSelection.tsx Practitioner Types', testRoleSelectionHandling);
runTest('No Generic Google OAuth Buttons', testNoGenericButtons);
runTest('Error Handling Implementation', testErrorHandling);

// Print summary
console.log('\n' + '=' .repeat(60));
console.log('📊 Test Summary');
console.log('=' .repeat(60));
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Total: ${testResults.total}`);
console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Google OAuth flow is properly implemented.');
} else {
    console.log('\n⚠️ Some tests failed. Please review the implementation.');
}

console.log('\n📋 Next Steps:');
console.log('1. Open test-google-oauth-flow.html in a browser');
console.log('2. Test the actual OAuth flow on the production site');
console.log('3. Verify both client and practitioner flows work correctly');
console.log('4. Check browser console for any errors during OAuth');
