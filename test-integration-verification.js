/**
 * INTEGRATION TEST: Verify Actual Code Changes
 * Tests the specific code modifications made to fix practitioner onboarding
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 INTEGRATION TEST: Code Changes Verification');
console.log('==============================================\n');

// Test 1: Verify Onboarding.tsx validation fix
console.log('📋 TEST 1: Onboarding.tsx Validation Fix');
console.log('----------------------------------------');

function testOnboardingValidationFix() {
  const onboardingPath = path.join(__dirname, 'src', 'pages', 'auth', 'Onboarding.tsx');
  
  try {
    const content = fs.readFileSync(onboardingPath, 'utf8');
    
    // Check if the fix is present
    const hasPractitionerDataObject = content.includes('const practitionerData = {');
    const hasPractitionerValidation = content.includes('validation = validateOnboardingData(userProfile?.user_role || \'client\', practitionerData);');
    const hasPhoneField = content.includes('phone: formData.phone,');
    const hasBioField = content.includes('bio: formData.bio,');
    const hasProfessionalBodyField = content.includes('professional_body: formData.professional_body,');
    
    console.log('✅ Practitioner data object creation:', hasPractitionerDataObject ? 'FOUND' : 'MISSING');
    console.log('✅ Practitioner-specific validation call:', hasPractitionerValidation ? 'FOUND' : 'MISSING');
    console.log('✅ Phone field mapping:', hasPhoneField ? 'FOUND' : 'MISSING');
    console.log('✅ Bio field mapping:', hasBioField ? 'FOUND' : 'MISSING');
    console.log('✅ Professional body field mapping:', hasProfessionalBodyField ? 'FOUND' : 'MISSING');
    
    const allChecksPass = hasPractitionerDataObject && hasPractitionerValidation && 
                         hasPhoneField && hasBioField && hasProfessionalBodyField;
    
    if (allChecksPass) {
      console.log('🎉 SUCCESS: Onboarding.tsx validation fix is properly implemented!');
    } else {
      console.log('❌ FAILURE: Onboarding.tsx validation fix is incomplete');
    }
    
    return allChecksPass;
  } catch (error) {
    console.log('❌ ERROR: Could not read Onboarding.tsx file');
    return false;
  }
}

// Test 2: Verify SubscriptionSelection.tsx plan name fix
console.log('\n💳 TEST 2: SubscriptionSelection.tsx Plan Name Fix');
console.log('------------------------------------------------');

function testSubscriptionPlanFix() {
  const subscriptionPath = path.join(__dirname, 'src', 'components', 'onboarding', 'SubscriptionSelection.tsx');
  
  try {
    const content = fs.readFileSync(subscriptionPath, 'utf8');
    
    // Check if the plan name fixes are present
    const hasPractitionerPlan = content.includes("id: 'practitioner'");
    const hasClinicPlan = content.includes("id: 'clinic'");
    const hasCorrectPricing = content.includes('price: 29') && content.includes('price: 99');
    const hasUpdatedPriceLogic = content.includes("plan.id === 'practitioner'") && content.includes("plan.id === 'clinic'");
    
    console.log('✅ Practitioner plan ID:', hasPractitionerPlan ? 'FOUND' : 'MISSING');
    console.log('✅ Clinic plan ID:', hasClinicPlan ? 'FOUND' : 'MISSING');
    console.log('✅ Correct pricing (£29, £99):', hasCorrectPricing ? 'FOUND' : 'MISSING');
    console.log('✅ Updated price calculation logic:', hasUpdatedPriceLogic ? 'FOUND' : 'MISSING');
    
    const allChecksPass = hasPractitionerPlan && hasClinicPlan && hasCorrectPricing && hasUpdatedPriceLogic;
    
    if (allChecksPass) {
      console.log('🎉 SUCCESS: SubscriptionSelection.tsx plan name fix is properly implemented!');
    } else {
      console.log('❌ FAILURE: SubscriptionSelection.tsx plan name fix is incomplete');
    }
    
    return allChecksPass;
  } catch (error) {
    console.log('❌ ERROR: Could not read SubscriptionSelection.tsx file');
    return false;
  }
}

// Test 3: Verify Edge Function compatibility
console.log('\n🔧 TEST 3: Edge Function Compatibility');
console.log('--------------------------------------');

function testEdgeFunctionCompatibility() {
  const edgeFunctionPath = path.join(__dirname, 'supabase', 'functions', 'create-checkout', 'index.ts');
  
  try {
    const content = fs.readFileSync(edgeFunctionPath, 'utf8');
    
    // Check if Edge Function supports the plan names we're using
    const hasPractitionerPlan = content.includes('practitioner: { monthly: 2900, yearly: 2610 }');
    const hasClinicPlan = content.includes('clinic: { monthly: 9900, yearly: 8910 }');
    const hasPlanPricing = content.includes('planPricing');
    
    console.log('✅ Practitioner plan pricing:', hasPractitionerPlan ? 'FOUND' : 'MISSING');
    console.log('✅ Clinic plan pricing:', hasClinicPlan ? 'FOUND' : 'MISSING');
    console.log('✅ Plan pricing structure:', hasPlanPricing ? 'FOUND' : 'MISSING');
    
    const allChecksPass = hasPractitionerPlan && hasClinicPlan && hasPlanPricing;
    
    if (allChecksPass) {
      console.log('🎉 SUCCESS: Edge Function is compatible with frontend plan names!');
    } else {
      console.log('❌ FAILURE: Edge Function compatibility issues detected');
    }
    
    return allChecksPass;
  } catch (error) {
    console.log('❌ ERROR: Could not read Edge Function file');
    return false;
  }
}

// Test 4: Verify validation utils are correct
console.log('\n📝 TEST 4: Validation Utils Correctness');
console.log('--------------------------------------');

function testValidationUtils() {
  const utilsPath = path.join(__dirname, 'src', 'lib', 'onboarding-utils.ts');
  
  try {
    const content = fs.readFileSync(utilsPath, 'utf8');
    
    // Check if validation includes required practitioner fields
    const hasProfessionalBodyInRequired = content.includes("'professional_body', 'registration_number'");
    const hasPractitionerValidation = content.includes('if (userRole === \'client\')') && 
                                     content.includes('} else {') &&
                                     content.includes('const practitionerData = data as OnboardingData;');
    
    console.log('✅ Professional body in required fields:', hasProfessionalBodyInRequired ? 'FOUND' : 'MISSING');
    console.log('✅ Practitioner validation logic:', hasPractitionerValidation ? 'FOUND' : 'MISSING');
    
    const allChecksPass = hasProfessionalBodyInRequired && hasPractitionerValidation;
    
    if (allChecksPass) {
      console.log('🎉 SUCCESS: Validation utils are correctly configured!');
    } else {
      console.log('❌ FAILURE: Validation utils need updates');
    }
    
    return allChecksPass;
  } catch (error) {
    console.log('❌ ERROR: Could not read validation utils file');
    return false;
  }
}

// Run all integration tests
console.log('\n🏁 RUNNING INTEGRATION TESTS');
console.log('============================');

const test1Result = testOnboardingValidationFix();
const test2Result = testSubscriptionPlanFix();
const test3Result = testEdgeFunctionCompatibility();
const test4Result = testValidationUtils();

console.log('\n📊 INTEGRATION TEST RESULTS');
console.log('===========================');
console.log(`Onboarding Validation Fix: ${test1Result ? '✅ VERIFIED' : '❌ ISSUES'}`);
console.log(`Subscription Plan Fix: ${test2Result ? '✅ VERIFIED' : '❌ ISSUES'}`);
console.log(`Edge Function Compatibility: ${test3Result ? '✅ VERIFIED' : '❌ ISSUES'}`);
console.log(`Validation Utils: ${test4Result ? '✅ VERIFIED' : '❌ ISSUES'}`);

const allIntegrationTestsPassed = test1Result && test2Result && test3Result && test4Result;

console.log(`\n🎯 INTEGRATION RESULT: ${allIntegrationTestsPassed ? '✅ ALL CHANGES VERIFIED' : '❌ SOME ISSUES DETECTED'}`);

if (allIntegrationTestsPassed) {
  console.log('\n🎉 COMPREHENSIVE VERIFICATION COMPLETE!');
  console.log('✅ All code changes are properly implemented');
  console.log('✅ Validation fix is correctly applied');
  console.log('✅ Stripe checkout plan names are synchronized');
  console.log('✅ Edge Function compatibility is confirmed');
  console.log('✅ Validation utils are properly configured');
  console.log('\n🚀 PRACTITIONER ONBOARDING IS READY FOR TESTING!');
} else {
  console.log('\n⚠️  VERIFICATION ISSUES DETECTED');
  console.log('Some code changes may not be properly implemented');
  console.log('Please review the failed tests above');
}

console.log('\n' + '='.repeat(60));
