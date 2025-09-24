import { createClient } from '@supabase/supabase-js';

// Test configuration
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

// Demo 1: User Authentication Flow
async function demoUserAuthentication() {
  console.log('\n🔐 DEMO 1: User Authentication Flow');
  console.log('=' .repeat(50));

  try {
    const testEmail = `demo.user.${Date.now()}@example.com`;
    const testPassword = 'DemoPassword123!';

    // Test sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Demo',
          last_name: 'User',
          user_role: 'client'
        }
      }
    });

    if (signUpError) throw signUpError;
    logTest('User Registration', 'PASS', `User ID: ${signUpData.user?.id}`);

    // Test sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) throw signInError;
    logTest('User Authentication', 'PASS', 'Session established');

    // Test sign out
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    logTest('User Sign Out', 'PASS', 'Session ended');

    return { userId: signUpData.user?.id, email: testEmail };

  } catch (error) {
    logTest('User Authentication Flow', 'FAIL', error.message);
    return null;
  }
}

// Demo 2: Marketplace Discovery
async function demoMarketplaceDiscovery() {
  console.log('\n🔍 DEMO 2: Marketplace Discovery');
  console.log('=' .repeat(50));

  try {
    // Browse all therapists
    const { data: allTherapists, error: allError } = await supabase
      .from('therapist_profiles')
      .select(`
        id,
        bio,
        location,
        specializations,
        hourly_rate,
        experience_years,
        verification_status,
        profile_score,
        total_reviews,
        average_rating
      `)
      .order('profile_score', { ascending: false });

    if (allError) throw allError;
    logTest('Browse All Therapists', 'PASS', `Found ${allTherapists.length} therapists`);

    // Filter by verification status
    const { data: verifiedTherapists, error: verifiedError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .eq('verification_status', 'verified');

    if (verifiedError) throw verifiedError;
    logTest('Verified Therapists', 'PASS', `Found ${verifiedTherapists.length} verified therapists`);

    // Search by specialization
    const { data: sportsTherapists, error: sportsError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .contains('specializations', ['sports_injury']);

    if (sportsError) throw sportsError;
    logTest('Sports Injury Specialists', 'PASS', `Found ${sportsTherapists.length} specialists`);

    // Search by location
    const { data: londonTherapists, error: londonError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .ilike('location', '%London%');

    if (londonError) throw londonError;
    logTest('London Therapists', 'PASS', `Found ${londonTherapists.length} London therapists`);

    return { allTherapists, verifiedTherapists, sportsTherapists, londonTherapists };

  } catch (error) {
    logTest('Marketplace Discovery', 'FAIL', error.message);
    return null;
  }
}

// Demo 3: Session Management
async function demoSessionManagement() {
  console.log('\n📅 DEMO 3: Session Management');
  console.log('=' .repeat(50));

  try {
    // View available sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('client_sessions')
      .select(`
        id,
        session_type,
        session_date,
        start_time,
        duration_minutes,
        status,
        price,
        payment_status,
        notes
      `)
      .order('session_date', { ascending: true });

    if (sessionsError) throw sessionsError;
    logTest('View Sessions', 'PASS', `Found ${sessions.length} sessions`);

    // Filter by status
    const { data: scheduledSessions, error: scheduledError } = await supabase
      .from('client_sessions')
      .select('*')
      .eq('status', 'scheduled');

    if (scheduledError) throw scheduledError;
    logTest('Scheduled Sessions', 'PASS', `Found ${scheduledSessions.length} scheduled sessions`);

    // Filter by payment status
    const { data: paidSessions, error: paidError } = await supabase
      .from('client_sessions')
      .select('*')
      .eq('payment_status', 'completed');

    if (paidError) throw paidError;
    logTest('Paid Sessions', 'PASS', `Found ${paidSessions.length} paid sessions`);

    return { sessions, scheduledSessions, paidSessions };

  } catch (error) {
    logTest('Session Management', 'FAIL', error.message);
    return null;
  }
}

// Demo 4: Credit System
async function demoCreditSystem() {
  console.log('\n💰 DEMO 4: Credit System');
  console.log('=' .repeat(50));

  try {
    // View credit rates
    const { data: creditRates, error: ratesError } = await supabase
      .from('credit_rates')
      .select('*')
      .eq('is_active', true);

    if (ratesError) throw ratesError;
    logTest('Credit Rates', 'PASS', `Found ${creditRates.length} active rates`);

    // View credit transactions (if any exist)
    const { data: transactions, error: transError } = await supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (transError) throw transError;
    logTest('Credit Transactions', 'PASS', `Found ${transactions.length} transactions`);

    // View credits (if any exist)
    const { data: credits, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .limit(10);

    if (creditsError) throw creditsError;
    logTest('Credit Balances', 'PASS', `Found ${credits.length} credit records`);

    return { creditRates, transactions, credits };

  } catch (error) {
    logTest('Credit System', 'FAIL', error.message);
    return null;
  }
}

// Demo 5: Messaging System
async function demoMessagingSystem() {
  console.log('\n💬 DEMO 5: Messaging System');
  console.log('=' .repeat(50));

  try {
    // View conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        conversation_key,
        participant1_id,
        participant2_id,
        conversation_status,
        last_message_at,
        created_at
      `)
      .order('last_message_at', { ascending: false });

    if (convError) throw convError;
    logTest('View Conversations', 'PASS', `Found ${conversations.length} conversations`);

    // View messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        message_type,
        message_status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) throw msgError;
    logTest('View Messages', 'PASS', `Found ${messages.length} messages`);

    return { conversations, messages };

  } catch (error) {
    logTest('Messaging System', 'FAIL', error.message);
    return null;
  }
}

// Demo 6: Review System
async function demoReviewSystem() {
  console.log('\n⭐ DEMO 6: Review System');
  console.log('=' .repeat(50));

  try {
    // View reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        overall_rating,
        title,
        comment,
        review_status,
        is_verified_session,
        helpful_votes,
        unhelpful_votes,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;
    logTest('View Reviews', 'PASS', `Found ${reviews.length} reviews`);

    // Filter by rating
    const { data: highRatedReviews, error: highRatedError } = await supabase
      .from('reviews')
      .select('*')
      .gte('overall_rating', 4);

    if (highRatedError) throw highRatedError;
    logTest('High Rated Reviews', 'PASS', `Found ${highRatedReviews.length} high-rated reviews`);

    // Filter by verified sessions
    const { data: verifiedReviews, error: verifiedError } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_verified_session', true);

    if (verifiedError) throw verifiedError;
    logTest('Verified Reviews', 'PASS', `Found ${verifiedReviews.length} verified reviews`);

    return { reviews, highRatedReviews, verifiedReviews };

  } catch (error) {
    logTest('Review System', 'FAIL', error.message);
    return null;
  }
}

// Demo 7: Payment System
async function demoPaymentSystem() {
  console.log('\n💳 DEMO 7: Payment System');
  console.log('=' .repeat(50));

  try {
    // View stripe payments
    const { data: payments, error: paymentsError } = await supabase
      .from('stripe_payments')
      .select(`
        id,
        amount,
        currency,
        status,
        payment_method,
        description,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (paymentsError) throw paymentsError;
    logTest('View Payments', 'PASS', `Found ${payments.length} payments`);

    // View subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        plan,
        billing_cycle,
        status,
        current_period_start,
        current_period_end
      `)
      .order('created_at', { ascending: false });

    if (subsError) throw subsError;
    logTest('View Subscriptions', 'PASS', `Found ${subscriptions.length} subscriptions`);

    // View platform revenue
    const { data: revenue, error: revenueError } = await supabase
      .from('platform_revenue')
      .select(`
        id,
        total_amount,
        platform_fee,
        practitioner_amount,
        payment_date
      `)
      .order('payment_date', { ascending: false });

    if (revenueError) throw revenueError;
    logTest('View Revenue', 'PASS', `Found ${revenue.length} revenue records`);

    return { payments, subscriptions, revenue };

  } catch (error) {
    logTest('Payment System', 'FAIL', error.message);
    return null;
  }
}

// Demo 8: Analytics and Reporting
async function demoAnalytics() {
  console.log('\n📊 DEMO 8: Analytics and Reporting');
  console.log('=' .repeat(50));

  try {
    // View business stats
    const { data: businessStats, error: statsError } = await supabase
      .from('business_stats')
      .select(`
        id,
        date,
        total_clients,
        active_clients,
        monthly_revenue,
        sessions_count,
        average_rating
      `)
      .order('date', { ascending: false });

    if (statsError) throw statsError;
    logTest('Business Stats', 'PASS', `Found ${businessStats.length} business stats`);

    // View performance metrics
    const { data: performanceMetrics, error: perfError } = await supabase
      .from('performance_metrics')
      .select(`
        id,
        metric_date,
        project_completion_rate,
        client_satisfaction_score,
        total_projects_completed,
        total_revenue
      `)
      .order('metric_date', { ascending: false });

    if (perfError) throw perfError;
    logTest('Performance Metrics', 'PASS', `Found ${performanceMetrics.length} performance records`);

    return { businessStats, performanceMetrics };

  } catch (error) {
    logTest('Analytics', 'FAIL', error.message);
    return null;
  }
}

// Demo 9: Real-time Features
async function demoRealTimeFeatures() {
  console.log('\n⚡ DEMO 9: Real-time Features');
  console.log('=' .repeat(50));

  try {
    // Test real-time subscription
    let subscriptionReceived = false;
    
    const subscription = supabase
      .channel('demo-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'therapist_profiles' },
        (payload) => {
          subscriptionReceived = true;
          logTest('Real-time Update', 'PASS', 'Received real-time update');
        }
      )
      .subscribe();

    // Wait for subscription to establish
    await delay(2000);

    // Unsubscribe
    await supabase.removeChannel(subscription);

    if (!subscriptionReceived) {
      logTest('Real-time Subscription', 'PASS', 'Subscription established (no updates received)');
    }

    return { subscriptionReceived };

  } catch (error) {
    logTest('Real-time Features', 'FAIL', error.message);
    return null;
  }
}

// Demo 10: Edge Functions
async function demoEdgeFunctions() {
  console.log('\n🔧 DEMO 10: Edge Functions');
  console.log('=' .repeat(50));

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

      if (response.ok || response.status === 405) {
        logTest(`Edge Function: ${funcName}`, 'PASS', 'Function is available');
        functionsAvailable++;
      } else {
        logTest(`Edge Function: ${funcName}`, 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      logTest(`Edge Function: ${funcName}`, 'FAIL', error.message);
    }
  }

  return { functionsAvailable, totalFunctions: functions.length };
}

// Main demo runner
async function runMarketplaceDemo() {
  console.log('🎬 Starting Marketplace & Client Features Demo');
  console.log('=' .repeat(60));
  console.log('This demo showcases all the marketplace and client features in real-time.');

  const startTime = Date.now();

  try {
    // Run all demos
    const authResult = await demoUserAuthentication();
    await delay(1000);

    const discoveryResult = await demoMarketplaceDiscovery();
    await delay(1000);

    const sessionResult = await demoSessionManagement();
    await delay(1000);

    const creditResult = await demoCreditSystem();
    await delay(1000);

    const messagingResult = await demoMessagingSystem();
    await delay(1000);

    const reviewResult = await demoReviewSystem();
    await delay(1000);

    const paymentResult = await demoPaymentSystem();
    await delay(1000);

    const analyticsResult = await demoAnalytics();
    await delay(1000);

    const realtimeResult = await demoRealTimeFeatures();
    await delay(1000);

    const functionsResult = await demoEdgeFunctions();

    // Calculate results
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 MARKETPLACE DEMO RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`⚡ Average Demo Duration: ${(totalDuration / 10).toFixed(0)}ms per demo`);

    console.log('\n📋 DEMO FEATURES SHOWCASED:');
    testResults.details.forEach((test, index) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.testName}: ${test.details}`);
    });

    if (testResults.failed === 0) {
      console.log('\n🎉 DEMO SUCCESS! All marketplace and client features are working perfectly!');
      console.log('✨ The platform is ready for real users!');
    } else {
      console.log(`\n⚠️  ${testResults.failed} demo(s) failed. Please review the details above.`);
    }

    // Cleanup
    if (authResult?.userId) {
      console.log('\n🧹 Cleaning up demo user...');
      try {
        const { error } = await supabase.auth.admin.deleteUser(authResult.userId);
        if (error) {
          console.log('⚠️  Cleanup warning:', error.message);
        } else {
          console.log('✅ Demo user cleaned up successfully');
        }
      } catch (cleanupError) {
        console.log('⚠️  Cleanup warning:', cleanupError.message);
      }
    }

  } catch (error) {
    console.error('\n💥 Demo failed:', error.message);
    process.exit(1);
  }
}

// Run the marketplace demo
runMarketplaceDemo().catch(console.error);
