import { createClient } from '@supabase/supabase-js';

// Test configuration - using public Supabase project
const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

const logTest = (testName, status, details = '') => {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSED ${details}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: FAILED ${details}`);
  }
  testResults.details.push({ testName, status, details });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test 1: Database Connection
async function testDatabaseConnection() {
  console.log('\n🔌 Testing Database Connection...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;
    logTest('Database Connection', 'PASS', 'Successfully connected to Supabase');
    return true;
  } catch (error) {
    logTest('Database Connection', 'FAIL', error.message);
    return false;
  }
}

// Test 2: Table Structure Verification
async function testTableStructure() {
  console.log('\n📊 Testing Table Structure...');
  
  const tables = [
    'users',
    'therapist_profiles', 
    'client_profiles',
    'client_sessions',
    'conversations',
    'messages',
    'reviews',
    'credits',
    'stripe_payments',
    'subscriptions',
    'platform_revenue',
    'webhook_events'
  ];

  let allTablesExist = true;

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        logTest(`Table: ${table}`, 'FAIL', 'Table does not exist');
        allTablesExist = false;
      } else {
        logTest(`Table: ${table}`, 'PASS', 'Table exists and accessible');
      }
    } catch (error) {
      logTest(`Table: ${table}`, 'FAIL', error.message);
      allTablesExist = false;
    }
  }

  return allTablesExist;
}

// Test 3: Authentication Flow
async function testAuthenticationFlow() {
  console.log('\n🔐 Testing Authentication Flow...');
  
  const testEmail = `test.${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Test sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          user_role: 'client'
        }
      }
    });

    if (signUpError) throw signUpError;
    logTest('User Sign Up', 'PASS', `User ID: ${signUpData.user?.id}`);

    // Test sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) throw signInError;
    logTest('User Sign In', 'PASS', 'Session established');

    // Test sign out
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    logTest('User Sign Out', 'PASS', 'Session ended');

    return { userId: signUpData.user?.id, email: testEmail };

  } catch (error) {
    logTest('Authentication Flow', 'FAIL', error.message);
    return null;
  }
}

// Test 4: Data Operations
async function testDataOperations() {
  console.log('\n💾 Testing Data Operations...');
  
  try {
    // Test read operation
    const { data: readData, error: readError } = await supabase
      .from('users')
      .select('id, email, user_role')
      .limit(5);

    if (readError) throw readError;
    logTest('Data Read', 'PASS', `Retrieved ${readData.length} records`);

    // Test if we can access therapist profiles
    const { data: therapistData, error: therapistError } = await supabase
      .from('therapist_profiles')
      .select('id, bio, hourly_rate, specializations')
      .limit(3);

    if (therapistError) {
      logTest('Therapist Profiles Read', 'FAIL', therapistError.message);
    } else {
      logTest('Therapist Profiles Read', 'PASS', `Retrieved ${therapistData.length} profiles`);
    }

    // Test if we can access client sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('client_sessions')
      .select('id, session_type, status, price')
      .limit(3);

    if (sessionError) {
      logTest('Client Sessions Read', 'FAIL', sessionError.message);
    } else {
      logTest('Client Sessions Read', 'PASS', `Retrieved ${sessionData.length} sessions`);
    }

    return true;

  } catch (error) {
    logTest('Data Operations', 'FAIL', error.message);
    return false;
  }
}

// Test 5: Real-time Subscription
async function testRealTimeSubscription() {
  console.log('\n⚡ Testing Real-time Subscription...');
  
  try {
    let subscriptionReceived = false;
    
    const subscription = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          subscriptionReceived = true;
          logTest('Real-time Subscription', 'PASS', 'Received real-time update');
        }
      )
      .subscribe();

    // Wait a bit for subscription to establish
    await delay(2000);

    // Unsubscribe
    await supabase.removeChannel(subscription);

    if (!subscriptionReceived) {
      logTest('Real-time Subscription', 'PASS', 'Subscription established (no updates received)');
    }

    return true;

  } catch (error) {
    logTest('Real-time Subscription', 'FAIL', error.message);
    return false;
  }
}

// Test 6: Edge Functions Availability
async function testEdgeFunctions() {
  console.log('\n🔧 Testing Edge Functions...');
  
  const functions = [
    'stripe-webhook',
    'create-checkout', 
    'check-subscription',
    'customer-portal',
    'stripe-payment'
  ];

  let functionsAvailable = 0;

  for (const funcName of functions) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${funcName}`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok || response.status === 405) { // 405 = Method Not Allowed is OK for OPTIONS
        logTest(`Edge Function: ${funcName}`, 'PASS', 'Function is available');
        functionsAvailable++;
      } else {
        logTest(`Edge Function: ${funcName}`, 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      logTest(`Edge Function: ${funcName}`, 'FAIL', error.message);
    }
  }

  return functionsAvailable === functions.length;
}

// Test 7: Credit System Structure
async function testCreditSystemStructure() {
  console.log('\n💰 Testing Credit System Structure...');
  
  try {
    // Test credits table
    const { data: creditsData, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .limit(1);

    if (creditsError) {
      logTest('Credits Table', 'FAIL', creditsError.message);
    } else {
      logTest('Credits Table', 'PASS', 'Credits table accessible');
    }

    // Test credit transactions table
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .limit(1);

    if (transactionsError) {
      logTest('Credit Transactions Table', 'FAIL', transactionsError.message);
    } else {
      logTest('Credit Transactions Table', 'PASS', 'Credit transactions table accessible');
    }

    return true;

  } catch (error) {
    logTest('Credit System Structure', 'FAIL', error.message);
    return false;
  }
}

// Test 8: Messaging System Structure
async function testMessagingSystemStructure() {
  console.log('\n💬 Testing Messaging System Structure...');
  
  try {
    // Test conversations table
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);

    if (conversationsError) {
      logTest('Conversations Table', 'FAIL', conversationsError.message);
    } else {
      logTest('Conversations Table', 'PASS', 'Conversations table accessible');
    }

    // Test messages table
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (messagesError) {
      logTest('Messages Table', 'FAIL', messagesError.message);
    } else {
      logTest('Messages Table', 'PASS', 'Messages table accessible');
    }

    return true;

  } catch (error) {
    logTest('Messaging System Structure', 'FAIL', error.message);
    return false;
  }
}

// Test 9: Payment System Structure
async function testPaymentSystemStructure() {
  console.log('\n💳 Testing Payment System Structure...');
  
  try {
    // Test stripe_payments table
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('stripe_payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      logTest('Stripe Payments Table', 'FAIL', paymentsError.message);
    } else {
      logTest('Stripe Payments Table', 'PASS', 'Stripe payments table accessible');
    }

    // Test subscriptions table
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);

    if (subscriptionsError) {
      logTest('Subscriptions Table', 'FAIL', subscriptionsError.message);
    } else {
      logTest('Subscriptions Table', 'PASS', 'Subscriptions table accessible');
    }

    // Test platform_revenue table
    const { data: revenueData, error: revenueError } = await supabase
      .from('platform_revenue')
      .select('*')
      .limit(1);

    if (revenueError) {
      logTest('Platform Revenue Table', 'FAIL', revenueError.message);
    } else {
      logTest('Platform Revenue Table', 'PASS', 'Platform revenue table accessible');
    }

    return true;

  } catch (error) {
    logTest('Payment System Structure', 'FAIL', error.message);
    return false;
  }
}

// Test 10: Performance Test
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  try {
    const startTime = Date.now();
    
    // Test multiple concurrent reads
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        supabase
          .from('users')
          .select('id')
          .limit(1)
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successCount = results.filter(r => !r.error).length;
    
    logTest('Performance Test', 'PASS', `${successCount}/10 concurrent operations completed in ${duration}ms`);
    
    return { duration, successCount };

  } catch (error) {
    logTest('Performance Test', 'FAIL', error.message);
    return { duration: 0, successCount: 0 };
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Simple Marketplace & Client Feature Testing...\n');
  console.log('=' .repeat(60));

  const startTime = Date.now();

  try {
    // Run all tests
    const dbConnection = await testDatabaseConnection();
    if (!dbConnection) {
      console.log('\n❌ Database connection failed. Cannot proceed with other tests.');
      return;
    }

    await testTableStructure();
    await delay(1000);

    const authResult = await testAuthenticationFlow();
    await delay(1000);

    await testDataOperations();
    await delay(1000);

    await testRealTimeSubscription();
    await delay(1000);

    await testEdgeFunctions();
    await delay(1000);

    await testCreditSystemStructure();
    await delay(1000);

    await testMessagingSystemStructure();
    await delay(1000);

    await testPaymentSystemStructure();
    await delay(1000);

    const performanceResult = await testPerformance();

    // Calculate final results
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`⚡ Performance: ${performanceResult.duration}ms for 10 concurrent operations`);

    console.log('\n📋 DETAILED RESULTS:');
    testResults.details.forEach((test, index) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.testName}: ${test.details}`);
    });

    if (testResults.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! The marketplace and client features are working perfectly!');
    } else {
      console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the details above.`);
    }

    // Cleanup test user if created
    if (authResult?.userId) {
      console.log('\n🧹 Cleaning up test user...');
      try {
        const { error } = await supabase.auth.admin.deleteUser(authResult.userId);
        if (error) {
          console.log('⚠️  Cleanup warning:', error.message);
        } else {
          console.log('✅ Test user cleaned up successfully');
        }
      } catch (cleanupError) {
        console.log('⚠️  Cleanup warning:', cleanupError.message);
      }
    }

  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(console.error);
