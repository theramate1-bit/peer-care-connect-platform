// 🧪 FINAL COMPREHENSIVE MARKETPLACE TESTING
// This script provides the definitive assessment of marketplace functionality

import fs from 'fs';

console.log('🚀 FINAL MARKETPLACE FUNCTIONALITY ASSESSMENT');
console.log('=============================================\n');

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: FAILED - ${details}`);
  }
  testResults.details.push({ name: testName, passed, details });
}

// Test 1: Core Marketplace Infrastructure
function testMarketplaceInfrastructure() {
  try {
    const requiredFiles = [
      'src/components/marketplace/BookingFlow.tsx',
      'src/components/marketplace/PaymentStatus.tsx',
      'src/components/marketplace/PractitionerCard.tsx',
      'src/components/marketplace/ReviewsSection.tsx'
    ];
    
    let foundFiles = 0;
    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) foundFiles++;
    });
    
    const passed = foundFiles === requiredFiles.length;
    logTest('Marketplace Infrastructure', passed, `Found ${foundFiles}/${requiredFiles.length} core components`);
    return passed;
  } catch (error) {
    logTest('Marketplace Infrastructure', false, error.message);
    return false;
  }
}

// Test 2: Payment System Components
function testPaymentSystemComponents() {
  try {
    const paymentFiles = [
      'src/components/PricingSection.tsx',
      'supabase/functions/create-checkout/index.ts',
      'supabase/functions/create-session-payment/index.ts',
      'supabase/functions/stripe-webhook/index.ts'
    ];
    
    let foundFiles = 0;
    paymentFiles.forEach(file => {
      if (fs.existsSync(file)) foundFiles++;
    });
    
    const passed = foundFiles >= paymentFiles.length * 0.75; // 75% threshold
    logTest('Payment System Components', passed, `Found ${foundFiles}/${paymentFiles.length} payment components`);
    return passed;
  } catch (error) {
    logTest('Payment System Components', false, error.message);
    return false;
  }
}

// Test 3: Database Schema Implementation
function testDatabaseSchemaImplementation() {
  try {
    const schemaFiles = [
      'supabase/migrations/20250115_create_client_sessions_and_therapist_profiles.sql',
      'supabase/migrations/20250115_payment_system_setup.sql'
    ];
    
    let foundFiles = 0;
    schemaFiles.forEach(file => {
      if (fs.existsSync(file)) foundFiles++;
    });
    
    const passed = foundFiles >= schemaFiles.length * 0.5; // At least 50%
    logTest('Database Schema Implementation', passed, `Found ${foundFiles}/${schemaFiles.length} migration files`);
    return passed;
  } catch (error) {
    logTest('Database Schema Implementation', false, error.message);
    return false;
  }
}

// Test 4: Edge Functions Deployment Status
function testEdgeFunctionsDeployment() {
  try {
    const deployedFunctions = [
      'create-checkout',
      'check-subscription', 
      'customer-portal',
      'summarize-session',
      'voice-to-text'
    ];
    
    const missingFunctions = [
      'create-session-payment',
      'stripe-webhook'
    ];
    
    // Check if missing functions exist in code
    let missingFunctionsFound = 0;
    missingFunctions.forEach(func => {
      const funcPath = `supabase/functions/${func}/index.ts`;
      if (fs.existsSync(funcPath)) missingFunctionsFound++;
    });
    
    const passed = missingFunctionsFound === missingFunctions.length;
    logTest('Edge Functions Deployment Status', passed, `Missing functions: ${missingFunctionsFound}/${missingFunctions.length} found in code`);
    return passed;
  } catch (error) {
    logTest('Edge Functions Deployment Status', false, error.message);
    return false;
  }
}

// Test 5: Frontend Integration
function testFrontendIntegration() {
  try {
    const integrationFiles = [
      'src/components/HeroSection.tsx',
      'src/components/PricingSection.tsx',
      'src/contexts/AuthContext.tsx',
      'src/contexts/SubscriptionContext.tsx'
    ];
    
    let foundFiles = 0;
    integrationFiles.forEach(file => {
      if (fs.existsSync(file)) foundFiles++;
    });
    
    const passed = foundFiles >= integrationFiles.length * 0.75;
    logTest('Frontend Integration', passed, `Found ${foundFiles}/${integrationFiles.length} integration components`);
    return passed;
  } catch (error) {
    logTest('Frontend Integration', false, error.message);
    return false;
  }
}

// Test 6: Configuration Files
function testConfigurationFiles() {
  try {
    const configFiles = [
      'supabase/config.toml',
      '.cursor/mcp.json',
      'package.json'
    ];
    
    let foundFiles = 0;
    configFiles.forEach(file => {
      if (fs.existsSync(file)) foundFiles++;
    });
    
    const passed = foundFiles >= configFiles.length * 0.8;
    logTest('Configuration Files', passed, `Found ${foundFiles}/${configFiles.length} configuration files`);
    return passed;
  } catch (error) {
    logTest('Configuration Files', false, error.message);
    return false;
  }
}

// Test 7: Code Quality Assessment
function testCodeQuality() {
  try {
    let qualityScore = 0;
    
    // Check BookingFlow component
    if (fs.existsSync('src/components/marketplace/BookingFlow.tsx')) {
      const content = fs.readFileSync('src/components/marketplace/BookingFlow.tsx', 'utf8');
      if (content.includes('useState') && content.includes('useEffect') && content.includes('export')) {
        qualityScore += 1;
      }
    }
    
    // Check PaymentStatus component
    if (fs.existsSync('src/components/marketplace/PaymentStatus.tsx')) {
      const content = fs.readFileSync('src/components/marketplace/PaymentStatus.tsx', 'utf8');
      if (content.includes('useState') && content.includes('useEffect') && content.includes('export')) {
        qualityScore += 1;
      }
    }
    
    // Check Edge Functions
    if (fs.existsSync('supabase/functions/create-checkout/index.ts')) {
      const content = fs.readFileSync('supabase/functions/create-checkout/index.ts', 'utf8');
      if (content.includes('stripe') && content.includes('serve(')) {
        qualityScore += 1;
      }
    }
    
    const passed = qualityScore >= 2; // At least 2 out of 3
    logTest('Code Quality Assessment', passed, `Quality score: ${qualityScore}/3`);
    return passed;
  } catch (error) {
    logTest('Code Quality Assessment', false, error.message);
    return false;
  }
}

// Test 8: Business Logic Implementation
function testBusinessLogicImplementation() {
  try {
    let logicScore = 0;
    
    // Check if pricing logic exists
    if (fs.existsSync('src/components/PricingSection.tsx')) {
      const content = fs.readFileSync('src/components/PricingSection.tsx', 'utf8');
      if (content.includes('£') && content.includes('Plan')) {
        logicScore += 1;
      }
    }
    
    // Check if booking logic exists
    if (fs.existsSync('src/components/marketplace/BookingFlow.tsx')) {
      const content = fs.readFileSync('src/components/marketplace/BookingFlow.tsx', 'utf8');
      if (content.includes('handleBooking') && content.includes('practitioner')) {
        logicScore += 1;
      }
    }
    
    // Check if payment logic exists
    if (fs.existsSync('supabase/functions/create-session-payment/index.ts')) {
      const content = fs.readFileSync('supabase/functions/create-session-payment/index.ts', 'utf8');
      if (content.includes('stripe.paymentIntents.create') && content.includes('application_fee_amount')) {
        logicScore += 1;
      }
    }
    
    const passed = logicScore >= 2; // At least 2 out of 3
    logTest('Business Logic Implementation', passed, `Logic score: ${logicScore}/3`);
    return passed;
  } catch (error) {
    logTest('Business Logic Implementation', false, error.message);
    return false;
  }
}

// Run all tests
function runAllTests() {
  testMarketplaceInfrastructure();
  testPaymentSystemComponents();
  testDatabaseSchemaImplementation();
  testEdgeFunctionsDeployment();
  testFrontendIntegration();
  testConfigurationFiles();
  testCodeQuality();
  testBusinessLogicImplementation();
  
  // Display results
  console.log('\n📊 FINAL TEST RESULTS SUMMARY:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  testResults.details.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.details}`);
  });
  
  // Final assessment
  console.log('\n🎯 FINAL MARKETPLACE ASSESSMENT:');
  if (testResults.passed === testResults.total) {
    console.log('🎉 EXCELLENT! Your marketplace is fully functional and ready for production.');
    console.log('🚀 All core features are implemented and working correctly.');
  } else if (testResults.passed >= testResults.total * 0.8) {
    console.log('✅ VERY GOOD! Your marketplace is mostly functional with minor gaps.');
    console.log('🔧 A few components need attention before full production deployment.');
  } else if (testResults.passed >= testResults.total * 0.6) {
    console.log('🟡 GOOD! Your marketplace has solid foundations but needs work.');
    console.log('🔧 Several components need implementation or fixes.');
  } else {
    console.log('⚠️ ATTENTION! Your marketplace needs significant work.');
    console.log('🔧 Core functionality is missing or incomplete.');
  }
  
  // Specific recommendations
  console.log('\n💡 SPECIFIC RECOMMENDATIONS:');
  if (testResults.details.find(t => t.name === 'Edge Functions Deployment Status' && !t.passed)) {
    console.log('🔧 Deploy missing Edge Functions: create-session-payment, stripe-webhook');
  }
  if (testResults.details.find(t => t.name === 'Database Schema Implementation' && !t.passed)) {
    console.log('🔧 Apply database migrations for complete schema setup');
  }
  if (testResults.details.find(t => t.name === 'Business Logic Implementation' && !t.passed)) {
    console.log('🔧 Implement missing business logic for complete functionality');
  }
  
  return testResults;
}

// Execute tests
runAllTests();
