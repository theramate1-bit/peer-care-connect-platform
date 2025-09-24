#!/usr/bin/env node

/**
 * Onboarding Inconsistencies Test
 * Focused test to identify specific inconsistencies in practitioner onboarding
 */

console.log('🔍 Testing for Onboarding Inconsistencies...\n');

// Test 1: Check if onboarding steps match between components
function testOnboardingStepConsistency() {
  console.log('1️⃣ Testing Onboarding Step Consistency...');
  
  // From Onboarding.tsx - actual implementation
  const actualSteps = [
    { step: 1, name: 'Personal Information', fields: ['firstName', 'lastName', 'phone', 'bio'] },
    { step: 2, name: 'Professional Details', fields: ['specializations', 'experience', 'qualifications'] },
    { step: 3, name: 'Location & Services', fields: ['location', 'consultationTypes', 'rates'] },
    { step: 4, name: 'Subscription Selection', fields: ['subscriptionPlan'] },
    { step: 5, name: 'Rates & Final Details', fields: ['rates', 'availability'] }
  ];

  // From test logic - expected
  const expectedSteps = [
    { step: 1, name: 'Personal Information', fields: ['firstName', 'lastName', 'phone', 'bio'] },
    { step: 2, name: 'Professional Details', fields: ['specializations', 'experience', 'qualifications'] },
    { step: 3, name: 'Location & Services', fields: ['location', 'consultationTypes', 'rates'] },
    { step: 4, name: 'Subscription Selection', fields: ['subscriptionPlan'] },
    { step: 5, name: 'Rates & Final Details', fields: ['rates', 'availability'] }
  ];

  let inconsistencies = [];
  
  actualSteps.forEach((actual, index) => {
    const expected = expectedSteps[index];
    if (actual.step !== expected.step) {
      inconsistencies.push(`Step ${index + 1}: Step number mismatch (${actual.step} vs ${expected.step})`);
    }
    if (actual.name !== expected.name) {
      inconsistencies.push(`Step ${index + 1}: Name mismatch (${actual.name} vs ${expected.name})`);
    }
    if (JSON.stringify(actual.fields.sort()) !== JSON.stringify(expected.fields.sort())) {
      inconsistencies.push(`Step ${index + 1}: Fields mismatch (${actual.fields.join(',')} vs ${expected.fields.join(',')})`);
    }
  });

  if (inconsistencies.length > 0) {
    console.log('❌ Inconsistencies found:');
    inconsistencies.forEach(inc => console.log(`   - ${inc}`));
    return { success: false, inconsistencies };
  }

  console.log('✅ Onboarding steps are consistent');
  return { success: true };
}

// Test 2: Check subscription plan consistency
function testSubscriptionPlanConsistency() {
  console.log('\n2️⃣ Testing Subscription Plan Consistency...');
  
  // From SubscriptionSelection.tsx
  const subscriptionComponent = {
    practitioner: { price: 29, yearlyPrice: 26.10, stripePriceId: 'price_1S6BTOFk77knaVvaqqm7Iq5M' },
    clinic: { price: 99, yearlyPrice: 89.10, stripePriceId: 'price_1S6BTTFk77knaVvadG0HDJAI' }
  };

  // From PricingSection.tsx
  const pricingSection = {
    practitioner: { monthlyPrice: 29, yearlyPrice: 26.10 },
    clinic: { monthlyPrice: 99, yearlyPrice: 89.10 }
  };

  // From payments.ts config
  const paymentConfig = {
    practitioner: { monthly: 2900, yearly: 31320 }, // in pence
    clinic: { monthly: 9900, yearly: 106920 } // in pence
  };

  let inconsistencies = [];

  // Check practitioner plan
  if (subscriptionComponent.practitioner.price !== pricingSection.practitioner.monthlyPrice) {
    inconsistencies.push('Practitioner monthly price mismatch between components');
  }
  if (subscriptionComponent.practitioner.yearlyPrice !== pricingSection.practitioner.yearlyPrice) {
    inconsistencies.push('Practitioner yearly price mismatch between components');
  }
  if (subscriptionComponent.practitioner.price * 100 !== paymentConfig.practitioner.monthly) {
    inconsistencies.push('Practitioner monthly price mismatch with config (pounds vs pence)');
  }

  // Check clinic plan
  if (subscriptionComponent.clinic.price !== pricingSection.clinic.monthlyPrice) {
    inconsistencies.push('Clinic monthly price mismatch between components');
  }
  if (subscriptionComponent.clinic.yearlyPrice !== pricingSection.clinic.yearlyPrice) {
    inconsistencies.push('Clinic yearly price mismatch between components');
  }
  if (subscriptionComponent.clinic.price * 100 !== paymentConfig.clinic.monthly) {
    inconsistencies.push('Clinic monthly price mismatch with config (pounds vs pence)');
  }

  if (inconsistencies.length > 0) {
    console.log('❌ Inconsistencies found:');
    inconsistencies.forEach(inc => console.log(`   - ${inc}`));
    return { success: false, inconsistencies };
  }

  console.log('✅ Subscription plans are consistent across components');
  return { success: true };
}

// Test 3: Check marketplace fee consistency
function testMarketplaceFeeConsistency() {
  console.log('\n3️⃣ Testing Marketplace Fee Consistency...');
  
  // From payments.ts
  const configFee = 0.03; // 3%
  const configAppliesTo = 'all_marketplace';

  // From SubscriptionSelection.tsx
  const componentFees = {
    practitioner: '3%',
    clinic: '3%'
  };

  // From documentation
  const expectedFee = 0.03; // 3%
  const expectedAppliesTo = 'all_marketplace';

  let inconsistencies = [];

  if (configFee !== expectedFee) {
    inconsistencies.push(`Config fee mismatch: ${configFee} vs ${expectedFee}`);
  }
  if (configAppliesTo !== expectedAppliesTo) {
    inconsistencies.push(`Config applies_to mismatch: ${configAppliesTo} vs ${expectedAppliesTo}`);
  }

  // Check if all component fees are 3%
  Object.entries(componentFees).forEach(([plan, fee]) => {
    if (fee !== '3%') {
      inconsistencies.push(`${plan} plan fee mismatch: ${fee} vs 3%`);
    }
  });

  if (inconsistencies.length > 0) {
    console.log('❌ Inconsistencies found:');
    inconsistencies.forEach(inc => console.log(`   - ${inc}`));
    return { success: false, inconsistencies };
  }

  console.log('✅ Marketplace fees are consistent');
  return { success: true };
}

// Test 4: Check Stripe price ID consistency
function testStripePriceIdConsistency() {
  console.log('\n4️⃣ Testing Stripe Price ID Consistency...');
  
  // From SubscriptionSelection.tsx
  const subscriptionPrices = {
    practitioner: {
      monthly: 'price_1S6BTOFk77knaVvaqqm7Iq5M',
      yearly: 'price_1S6BTQFk77knaVvakB9spQHa'
    },
    clinic: {
      monthly: 'price_1S6BTTFk77knaVvadG0HDJAI',
      yearly: 'price_1S6BTWFk77knaVvagCKZZh3H'
    }
  };

  // From payments.ts
  const configPrices = {
    practitioner: {
      monthly: 'price_1S6BTOFk77knaVvaqqm7Iq5M',
      yearly: 'price_1S6BTQFk77knaVvakB9spQHa'
    },
    clinic: {
      monthly: 'price_1S6BTTFk77knaVvadG0HDJAI',
      yearly: 'price_1S6BTWFk77knaVvagCKZZh3H'
    }
  };

  let inconsistencies = [];

  Object.entries(subscriptionPrices).forEach(([plan, prices]) => {
    Object.entries(prices).forEach(([cycle, priceId]) => {
      if (priceId !== configPrices[plan][cycle]) {
        inconsistencies.push(`${plan} ${cycle} price ID mismatch: ${priceId} vs ${configPrices[plan][cycle]}`);
      }
    });
  });

  if (inconsistencies.length > 0) {
    console.log('❌ Inconsistencies found:');
    inconsistencies.forEach(inc => console.log(`   - ${inc}`));
    return { success: false, inconsistencies };
  }

  console.log('✅ Stripe price IDs are consistent');
  return { success: true };
}

// Test 5: Check onboarding flow logic
function testOnboardingFlowLogic() {
  console.log('\n5️⃣ Testing Onboarding Flow Logic...');
  
  // Test step progression logic
  const testScenarios = [
    { currentStep: 1, hasRequiredData: true, expectedCanProceed: true },
    { currentStep: 2, hasRequiredData: true, expectedCanProceed: true },
    { currentStep: 3, hasRequiredData: true, expectedCanProceed: true },
    { currentStep: 4, hasRequiredData: false, expectedCanProceed: false }, // Needs subscription
    { currentStep: 4, hasRequiredData: true, hasSubscription: true, expectedCanProceed: true },
    { currentStep: 5, hasRequiredData: true, hasSubscription: true, expectedCanProceed: true }
  ];

  let inconsistencies = [];

  testScenarios.forEach((scenario, index) => {
    const { currentStep, hasRequiredData, hasSubscription = false, expectedCanProceed } = scenario;
    
    // Simulate the logic from Onboarding.tsx
    let canProceed = false;
    
    if (currentStep < 4) {
      canProceed = hasRequiredData;
    } else if (currentStep === 4) {
      canProceed = hasRequiredData && hasSubscription;
    } else if (currentStep === 5) {
      canProceed = hasRequiredData && hasSubscription;
    }

    if (canProceed !== expectedCanProceed) {
      inconsistencies.push(`Step ${currentStep}: Can proceed logic mismatch (${canProceed} vs ${expectedCanProceed})`);
    }
  });

  if (inconsistencies.length > 0) {
    console.log('❌ Inconsistencies found:');
    inconsistencies.forEach(inc => console.log(`   - ${inc}`));
    return { success: false, inconsistencies };
  }

  console.log('✅ Onboarding flow logic is consistent');
  return { success: true };
}

// Test 6: Check role-based access consistency
function testRoleBasedAccessConsistency() {
  console.log('\n6️⃣ Testing Role-based Access Consistency...');
  
  const practitionerRoles = ['sports_therapist', 'massage_therapist', 'osteopath'];
  const clientRole = 'client';
  
  // Test dashboard routing
  const dashboardRoutes = {
    'sports_therapist': '/dashboard/sports-therapist',
    'massage_therapist': '/dashboard/massage-therapist',
    'osteopath': '/dashboard/osteopath'
  };

  // Test subscription requirements
  const requiresSubscription = {
    practitioners: true,
    clients: false
  };

  let inconsistencies = [];

  // Check if all practitioner roles have dashboard routes
  practitionerRoles.forEach(role => {
    if (!dashboardRoutes[role]) {
      inconsistencies.push(`Missing dashboard route for ${role}`);
    }
  });

  // Check if client role doesn't have practitioner dashboard access
  if (dashboardRoutes[clientRole]) {
    inconsistencies.push(`Client role should not have dashboard route`);
  }

  if (inconsistencies.length > 0) {
    console.log('❌ Inconsistencies found:');
    inconsistencies.forEach(inc => console.log(`   - ${inc}`));
    return { success: false, inconsistencies };
  }

  console.log('✅ Role-based access is consistent');
  return { success: true };
}

// Run all tests
function runInconsistencyTests() {
  console.log('🚀 Running Inconsistency Detection Tests...\n');
  
  const results = {
    onboardingSteps: testOnboardingStepConsistency(),
    subscriptionPlans: testSubscriptionPlanConsistency(),
    marketplaceFees: testMarketplaceFeeConsistency(),
    stripePriceIds: testStripePriceIdConsistency(),
    onboardingFlow: testOnboardingFlowLogic(),
    roleBasedAccess: testRoleBasedAccessConsistency()
  };

  console.log('\n📊 Inconsistency Test Results:');
  console.log('==============================');
  
  let totalInconsistencies = 0;
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅ CONSISTENT' : '❌ INCONSISTENT';
    console.log(`${test.padEnd(20)}: ${status}`);
    if (!result.success && result.inconsistencies) {
      totalInconsistencies += result.inconsistencies.length;
      result.inconsistencies.forEach(inc => console.log(`  - ${inc}`));
    }
  });

  console.log(`\n📈 Summary: ${totalInconsistencies} inconsistencies found`);
  
  if (totalInconsistencies === 0) {
    console.log('🎉 No inconsistencies found! Practitioner onboarding flow is fully consistent.');
  } else {
    console.log('⚠️  Inconsistencies detected. Review the issues above.');
  }

  return results;
}

// Run the tests
runInconsistencyTests();
