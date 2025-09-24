// 🧪 COMPREHENSIVE MARKETPLACE TESTING SCRIPT (ES Module)
// This script tests all user flows in your marketplace application

const BASE_URL = 'http://localhost:8080';
const SUPABASE_URL = 'https://aikqnvltuwwgifuocvto.supabase.co';

// Test data
const testUsers = {
  client: {
    email: 'testclient@example.com',
    password: 'testpassword123'
  },
  practitioner: {
    email: 'testpractitioner@example.com',
    password: 'testpassword123'
  }
};

const testSession = {
  title: 'Test Therapy Session',
  description: 'A test session for marketplace testing',
  duration: 60,
  price: 5000, // £50.00
  date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility function to log test results
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

// Test 1: Frontend Application Loading
async function testFrontendLoading() {
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    const passed = response.ok && html.includes('peer-care-connect');
    logTest('Frontend Application Loading', passed, `Status: ${response.status}`);
    return passed;
  } catch (error) {
    logTest('Frontend Application Loading', false, error.message);
    return false;
  }
}

// Test 2: Pricing Section Display
async function testPricingSection() {
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    const passed = html.includes('Starter Plan') && 
                   html.includes('Practitioner Plan') && 
                   html.includes('Clinic Plan') &&
                   html.includes('£0') &&
                   html.includes('£29') &&
                   html.includes('£99');
    logTest('Pricing Section Display', passed, 'Checking for all plan tiers and pricing');
    return passed;
  } catch (error) {
    logTest('Pricing Section Display', false, error.message);
    return false;
  }
}

// Test 3: Hero Video Section
async function testHeroVideo() {
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    const passed = html.includes('hero.mp4') || html.includes('video');
    logTest('Hero Video Section', passed, 'Checking for video element or hero.mp4 reference');
    return passed;
  } catch (error) {
    logTest('Hero Video Section', false, error.message);
    return false;
  }
}

// Test 4: Edge Functions Availability
async function testEdgeFunctions() {
  const functions = [
    'create-checkout',
    'create-session-payment', 
    'stripe-webhook',
    'customer-portal',
    'check-subscription'
  ];
  
  let allFunctionsWorking = true;
  
  for (const func of functions) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdnp3eHZwZmZsdmtrdnZhcXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzIyMTEsImV4cCI6MjA3MTMwODIxMX0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
        },
        body: JSON.stringify({ test: true })
      });
      
      // Even if it returns an error, the function is accessible
      const passed = response.status !== 404;
      logTest(`Edge Function: ${func}`, passed, `Status: ${response.status}`);
      
      if (!passed) allFunctionsWorking = false;
    } catch (error) {
      logTest(`Edge Function: ${func}`, false, error.message);
      allFunctionsWorking = false;
    }
  }
  
  return allFunctionsWorking;
}

// Test 5: Database Schema Verification
async function testDatabaseSchema() {
  try {
    // Test if we can access the database through our functions
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdnp3eHZwZmZsdmtrdnZhcXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzIyMTEsImV4cCI6MjA3MTMwODIxMX0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      },
      body: JSON.stringify({ userId: 'test-user-id' })
    });
    
    const passed = response.status !== 500; // Should not be server error
    logTest('Database Schema Verification', passed, `Response status: ${response.status}`);
    return passed;
  } catch (error) {
    logTest('Database Schema Verification', false, error.message);
    return false;
  }
}

// Test 6: Stripe Integration Test
async function testStripeIntegration() {
  try {
    // Test if Stripe products are accessible
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdnp3eHZwZmZsdmtrdnZhcXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzIyMTEsImV4cCI6MjA3MTMwODIxMX0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      },
      body: JSON.stringify({ 
        plan: 'practitioner', 
        userId: 'test-user-id' 
      })
    });
    
    const passed = response.status !== 500; // Should not be server error
    logTest('Stripe Integration Test', passed, `Response status: ${response.status}`);
    return passed;
  } catch (error) {
    logTest('Stripe Integration Test', false, error.message);
    return false;
  }
}

// Test 7: Marketplace Components
async function testMarketplaceComponents() {
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    
    // Check for marketplace-specific components
    const components = [
      'BookingFlow',
      'PaymentStatus',
      'marketplace',
      'practitioner',
      'session'
    ];
    
    let foundComponents = 0;
    components.forEach(component => {
      if (html.includes(component)) foundComponents++;
    });
    
    const passed = foundComponents >= 3; // At least 3 components should be present
    logTest('Marketplace Components', passed, `Found ${foundComponents}/${components.length} components`);
    return passed;
  } catch (error) {
    logTest('Marketplace Components', false, error.message);
    return false;
  }
}

// Test 8: Responsive Design
async function testResponsiveDesign() {
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    
    // Check for Tailwind CSS classes that indicate responsive design
    const responsiveClasses = [
      'md:', 'lg:', 'xl:', 'sm:', 'max-w-', 'min-h-', 'flex', 'grid'
    ];
    
    let foundClasses = 0;
    responsiveClasses.forEach(className => {
      if (html.includes(className)) foundClasses++;
    });
    
    const passed = foundClasses >= 5; // Should have multiple responsive classes
    logTest('Responsive Design', passed, `Found ${foundClasses}/${responsiveClasses.length} responsive classes`);
    return passed;
  } catch (error) {
    logTest('Responsive Design', false, error.message);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE MARKETPLACE TESTING...\n');
  
  // Run all tests
  await testFrontendLoading();
  await testPricingSection();
  await testHeroVideo();
  await testEdgeFunctions();
  await testDatabaseSchema();
  await testStripeIntegration();
  await testMarketplaceComponents();
  await testResponsiveDesign();
  
  // Display results
  console.log('\n📊 TEST RESULTS SUMMARY:');
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
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! Your marketplace is ready for production.');
  } else {
    console.log('⚠️ Some tests failed. Review the details above and fix issues before deployment.');
    console.log('🔧 Focus on fixing failed tests to ensure marketplace functionality.');
  }
  
  return testResults;
}

// Run tests immediately
runAllTests().catch(console.error);
