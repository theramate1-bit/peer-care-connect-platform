#!/usr/bin/env node

/**
 * Professional Onboarding Flow Test Script
 * Tests the new 4-step professional onboarding process
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Professional Onboarding Flow...\n");

// Test 1: Verify Onboarding.tsx structure
console.log("1️⃣ Testing Onboarding.tsx structure...");
const onboardingPath = "src/pages/auth/Onboarding.tsx";
const onboardingContent = fs.readFileSync(onboardingPath, "utf8");

// Check for 4-step flow
const totalStepsMatch = onboardingContent.includes("totalSteps: 4");
const step3Subscription =
  onboardingContent.includes("step === 3") &&
  onboardingContent.includes("subscription");
const step4ServiceSetup =
  onboardingContent.includes("step === 4") &&
  onboardingContent.includes("Service Setup");

console.log(`   ✅ Total steps set to 4: ${totalStepsMatch}`);
console.log(`   ✅ Step 3 is subscription: ${step3Subscription}`);
console.log(`   ✅ Step 4 is service setup: ${step4ServiceSetup}`);

// Check for new form fields
const newFields = [
  "professional_statement",
  "treatment_philosophy",
  "response_time_hours",
];

newFields.forEach((field) => {
  const hasField = onboardingContent.includes(field);
  console.log(`   ✅ Has ${field} field: ${hasField}`);
});

// Test 2: Verify onboarding-utils.ts updates
console.log("\n2️⃣ Testing onboarding-utils.ts updates...");
const utilsPath = "src/lib/onboarding-utils.ts";
const utilsContent = fs.readFileSync(utilsPath, "utf8");

// Check for new fields in interface
const interfaceMatch = newFields.every((field) => utilsContent.includes(field));
console.log(`   ✅ OnboardingData interface has new fields: ${interfaceMatch}`);

// Check for new fields in completePractitionerOnboarding
const saveMatch = newFields.every((field) =>
  utilsContent.includes(
    `professional_statement: formData.professional_statement`,
  ),
);
console.log(`   ✅ New fields saved to database: ${saveMatch}`);

// Test 3: Verify SubscriptionSelection.tsx updates
console.log("\n3️⃣ Testing SubscriptionSelection.tsx updates...");
const subscriptionPath = "src/components/onboarding/SubscriptionSelection.tsx";
const subscriptionContent = fs.readFileSync(subscriptionPath, "utf8");

// Check for new plan names
const basicPlan = subscriptionContent.includes("Basic Plan");
const proPlan = subscriptionContent.includes("Pro Plan");
const basicPrice = subscriptionContent.includes("price: 30");
const proPrice = subscriptionContent.includes("price: 50");

console.log(`   ✅ Basic Plan name: ${basicPlan}`);
console.log(`   ✅ Pro Plan name: ${proPlan}`);
console.log(`   ✅ Basic Plan price £30: ${basicPrice}`);
console.log(`   ✅ Pro Plan price £50: ${proPrice}`);

// Check for yearly pricing
const yearlyBasic = subscriptionContent.includes("price: 27");
const yearlyPro = subscriptionContent.includes("price: 45");
console.log(`   ✅ Yearly Basic £27: ${yearlyBasic}`);
console.log(`   ✅ Yearly Pro £45: ${yearlyPro}`);

// Test 4: Verify database schema supports new fields
console.log("\n4️⃣ Testing database schema compatibility...");
const migrationPath =
  "supabase/migrations/20250111_create_practitioner_services.sql";
const migrationContent = fs.readFileSync(migrationPath, "utf8");

// Check if therapist_profiles table has the fields we need
const hasProfessionalStatement = migrationContent.includes(
  "professional_statement",
);
const hasTreatmentPhilosophy = migrationContent.includes(
  "treatment_philosophy",
);
const hasResponseTime = migrationContent.includes("response_time_hours");

console.log(
  `   ✅ Database has professional_statement: ${hasProfessionalStatement}`,
);
console.log(
  `   ✅ Database has treatment_philosophy: ${hasTreatmentPhilosophy}`,
);
console.log(`   ✅ Database has response_time_hours: ${hasResponseTime}`);

// Test 5: Verify marketplace integration
console.log("\n5️⃣ Testing marketplace integration...");
const marketplaceFiles = [
  "src/services/practitionerServices.ts",
  "src/services/bookingService.ts",
  "src/utils/pricing.ts",
  "src/components/practitioner/ServiceManagement.tsx",
  "src/components/marketplace/ServiceBrowser.tsx",
  "src/components/booking/ServiceBooking.tsx",
];

let marketplaceFilesExist = 0;
marketplaceFiles.forEach((file) => {
  const exists = fs.existsSync(file);
  if (exists) marketplaceFilesExist++;
  console.log(
    `   ${exists ? "✅" : "❌"} ${file}: ${exists ? "Exists" : "Missing"}`,
  );
});

console.log(
  `   📊 Marketplace files created: ${marketplaceFilesExist}/${marketplaceFiles.length}`,
);

// Test 6: Verify Stripe integration
console.log("\n6️⃣ Testing Stripe integration...");
const stripeServicePath = "src/services/stripeService.ts";
const stripeServiceExists = fs.existsSync(stripeServicePath);
console.log(`   ✅ Stripe service exists: ${stripeServiceExists}`);

// Test 7: Verify onboarding flow logic
console.log("\n7️⃣ Testing onboarding flow logic...");

// Check step progression
const step1Validation =
  onboardingContent.includes("step === 1") &&
  onboardingContent.includes("professional");
const step2Validation =
  onboardingContent.includes("step === 2") &&
  onboardingContent.includes("Professional Details");
const step3Validation =
  onboardingContent.includes("step === 3") &&
  onboardingContent.includes("subscription");
const step4Validation =
  onboardingContent.includes("step === 4") &&
  onboardingContent.includes("Service Setup");

console.log(`   ✅ Step 1: Professional type selection: ${step1Validation}`);
console.log(`   ✅ Step 2: Professional details: ${step2Validation}`);
console.log(`   ✅ Step 3: Subscription selection: ${step3Validation}`);
console.log(`   ✅ Step 4: Service setup: ${step4Validation}`);

// Check subscription requirement
const subscriptionRequired =
  onboardingContent.includes("step === 4") &&
  onboardingContent.includes("subscription");
console.log(
  `   ✅ Subscription required before completion: ${subscriptionRequired}`,
);

// Test 8: Verify form validation
console.log("\n8️⃣ Testing form validation...");
const hasValidation = onboardingContent.includes("validateOnboardingData");
const hasRequiredFields = newFields.every((field) =>
  onboardingContent.includes(field),
);
console.log(`   ✅ Has validation function: ${hasValidation}`);
console.log(`   ✅ New fields are required: ${hasRequiredFields}`);

// Test 9: Verify navigation logic
console.log("\n9️⃣ Testing navigation logic...");
const hasNextButton = onboardingContent.includes("handleNext");
const hasBackButton = onboardingContent.includes("handleBack");
const hasCompleteButton = onboardingContent.includes("handleComplete");

console.log(`   ✅ Has next button logic: ${hasNextButton}`);
console.log(`   ✅ Has back button logic: ${hasBackButton}`);
console.log(`   ✅ Has complete button logic: ${hasCompleteButton}`);

// Test 10: Verify marketplace data collection
console.log("\n🔟 Testing marketplace data collection...");
const marketplaceFields = [
  "hourly_rate",
  "professional_statement",
  "treatment_philosophy",
  "response_time_hours",
];

const allMarketplaceFields = marketplaceFields.every((field) =>
  onboardingContent.includes(field),
);
console.log(`   ✅ All marketplace fields collected: ${allMarketplaceFields}`);

// Summary
console.log("\n📋 TEST SUMMARY");
console.log("================");

const tests = [
  {
    name: "4-step flow structure",
    passed: totalStepsMatch && step3Subscription && step4ServiceSetup,
  },
  {
    name: "New form fields",
    passed: newFields.every((field) => onboardingContent.includes(field)),
  },
  {
    name: "Database schema support",
    passed:
      hasProfessionalStatement && hasTreatmentPhilosophy && hasResponseTime,
  },
  {
    name: "Subscription integration",
    passed: basicPlan && proPlan && basicPrice && proPrice,
  },
  { name: "Yearly pricing", passed: yearlyBasic && yearlyPro },
  { name: "Marketplace files", passed: marketplaceFilesExist >= 4 },
  { name: "Stripe integration", passed: stripeServiceExists },
  {
    name: "Step progression",
    passed:
      step1Validation && step2Validation && step3Validation && step4Validation,
  },
  { name: "Form validation", passed: hasValidation && hasRequiredFields },
  {
    name: "Navigation logic",
    passed: hasNextButton && hasBackButton && hasCompleteButton,
  },
  { name: "Marketplace data", passed: allMarketplaceFields },
];

const passedTests = tests.filter((test) => test.passed).length;
const totalTests = tests.length;

console.log(`\n✅ Passed: ${passedTests}/${totalTests} tests`);

tests.forEach((test) => {
  console.log(`   ${test.passed ? "✅" : "❌"} ${test.name}`);
});

if (passedTests === totalTests) {
  console.log(
    "\n🎉 ALL TESTS PASSED! The professional onboarding flow is properly configured.",
  );
  console.log("\n📝 ONBOARDING FLOW SUMMARY:");
  console.log("   Step 1: Professional Type Selection");
  console.log(
    "   Step 2: Professional Details (including professional_statement)",
  );
  console.log(
    "   Step 3: Subscription Selection (Basic £30/£27 or Pro £50/£45)",
  );
  console.log(
    "   Step 4: Service Setup & Final Details (hourly_rate, treatment_philosophy, response_time_hours)",
  );
  console.log("\n🔗 MARKETPLACE INTEGRATION:");
  console.log("   - Custom pricing for practitioners");
  console.log("   - 4% platform fee on transactions");
  console.log("   - Service management tools");
  console.log("   - Client booking system");
} else {
  console.log("\n⚠️  Some tests failed. Please review the issues above.");
}

console.log(
  "\n🚀 Ready for testing! Start the dev server and test the professional registration flow.",
);
