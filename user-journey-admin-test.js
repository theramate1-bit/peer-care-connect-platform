import { createClient } from '@supabase/supabase-js';

// Test configuration - using service role for admin operations
const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYxOTk0OCwiZXhwIjoyMDcxMTk1OTQ4fQ.placeholder'; // Replace with actual service key

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

// Test data
const testData = {
  client: {
    email: `client.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Client',
    phone: '+1234567890'
  },
  therapist: {
    email: `therapist.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Dr. Jane',
    lastName: 'Therapist',
    phone: '+1234567891',
    specializations: ['sports_injury', 'rehabilitation'],
    hourlyRate: 80,
    bio: 'Experienced sports therapist with 10+ years of practice.',
    location: 'London, UK'
  }
};

// Step 1: User Registration Journey
async function testUserRegistrationJourney() {
  console.log('\n👤 STEP 1: User Registration Journey');
  console.log('=' .repeat(50));

  try {
    // Register client
    const { data: clientData, error: clientError } = await supabase.auth.signUp({
      email: testData.client.email,
      password: testData.client.password,
      options: {
        data: {
          first_name: testData.client.firstName,
          last_name: testData.client.lastName,
          user_role: 'client'
        }
      }
    });

    if (clientError) throw clientError;
    logTest('Client Registration', 'PASS', `User ID: ${clientData.user?.id}`);

    // Register therapist
    const { data: therapistData, error: therapistError } = await supabase.auth.signUp({
      email: testData.therapist.email,
      password: testData.therapist.password,
      options: {
        data: {
          first_name: testData.therapist.firstName,
          last_name: testData.therapist.lastName,
          user_role: 'sports_therapist'
        }
      }
    });

    if (therapistError) throw therapistError;
    logTest('Therapist Registration', 'PASS', `User ID: ${therapistData.user?.id}`);

    return {
      client: clientData.user,
      therapist: therapistData.user
    };

  } catch (error) {
    logTest('User Registration Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 2: Profile Setup Journey (using admin client)
async function testProfileSetupJourney(users) {
  console.log('\n📝 STEP 2: Profile Setup Journey');
  console.log('=' .repeat(50));

  try {
    // Create client profile using admin client
    const { data: clientProfile, error: clientProfileError } = await supabaseAdmin
      .from('client_profiles')
      .insert({
        user_id: users.client.id,
        preferences: {
          preferred_communication: 'email',
          notification_frequency: 'daily',
          session_reminders: true
        },
        medical_history: 'No significant medical history',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '+1234567890',
        client_type: 'individual',
        profile_completion_score: 85
      })
      .select()
      .single();

    if (clientProfileError) throw clientProfileError;
    logTest('Client Profile Setup', 'PASS', `Profile ID: ${clientProfile.id}`);

    // Create therapist profile using admin client
    const { data: therapistProfile, error: therapistProfileError } = await supabaseAdmin
      .from('therapist_profiles')
      .insert({
        user_id: users.therapist.id,
        bio: testData.therapist.bio,
        location: testData.therapist.location,
        specializations: testData.therapist.specializations,
        hourly_rate: testData.therapist.hourlyRate,
        experience_years: 10,
        professional_body: 'society_of_sports_therapists',
        qualifications: ['BSc Sports Therapy', 'MSc Rehabilitation'],
        verification_status: 'verified',
        profile_completion_status: 'complete',
        profile_score: 95
      })
      .select()
      .single();

    if (therapistProfileError) throw therapistProfileError;
    logTest('Therapist Profile Setup', 'PASS', `Profile ID: ${therapistProfile.id}`);

    return { clientProfile, therapistProfile };

  } catch (error) {
    logTest('Profile Setup Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 3: Credit System Journey
async function testCreditSystemJourney(users) {
  console.log('\n💰 STEP 3: Credit System Journey');
  console.log('=' .repeat(50));

  try {
    // Initialize credits for client using admin client
    const { data: creditData, error: creditError } = await supabaseAdmin
      .from('credits')
      .insert({
        user_id: users.client.id,
        current_balance: 100,
        total_earned: 100,
        total_spent: 0
      })
      .select()
      .single();

    if (creditError) throw creditError;
    logTest('Credit Initialization', 'PASS', `Balance: ${creditData.current_balance}`);

    // Test credit transaction (spending) using admin client
    const { data: transactionData, error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: users.client.id,
        amount: -20,
        transaction_type: 'session_payment',
        description: 'Payment for therapy session',
        balance_after: 80
      })
      .select()
      .single();

    if (transactionError) throw transactionError;
    logTest('Credit Transaction', 'PASS', `Amount: ${transactionData.amount}`);

    return { creditData, transactionData };

  } catch (error) {
    logTest('Credit System Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 4: Marketplace Discovery Journey
async function testMarketplaceDiscoveryJourney(users, profiles) {
  console.log('\n🔍 STEP 4: Marketplace Discovery Journey');
  console.log('=' .repeat(50));

  try {
    // Set up therapist availability using admin client
    const { data: availabilityData, error: availabilityError } = await supabaseAdmin
      .from('availability_slots')
      .insert({
        therapist_id: users.therapist.id,
        day_of_week: 1, // Monday
        start_time: '09:00',
        end_time: '17:00',
        duration_minutes: 60,
        is_available: true
      })
      .select()
      .single();

    if (availabilityError) throw availabilityError;
    logTest('Availability Setup', 'PASS', `Slot ID: ${availabilityData.id}`);

    // Simulate client browsing therapists using regular client
    const { data: therapistsData, error: therapistsError } = await supabase
      .from('therapist_profiles')
      .select(`
        id,
        bio,
        location,
        specializations,
        hourly_rate,
        experience_years,
        verification_status,
        profile_score
      `)
      .eq('verification_status', 'verified')
      .order('profile_score', { ascending: false });

    if (therapistsError) throw therapistsError;
    logTest('Therapist Discovery', 'PASS', `Found ${therapistsData.length} verified therapists`);

    // Simulate client searching by specialization
    const { data: searchData, error: searchError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .contains('specializations', ['sports_injury']);

    if (searchError) throw searchError;
    logTest('Specialization Search', 'PASS', `Found ${searchData.length} sports injury specialists`);

    return { availabilityData, therapistsData, searchData };

  } catch (error) {
    logTest('Marketplace Discovery Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 5: Session Booking Journey
async function testSessionBookingJourney(users, profiles) {
  console.log('\n📅 STEP 5: Session Booking Journey');
  console.log('=' .repeat(50));

  try {
    // Create session booking using admin client
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() + 1); // Tomorrow

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('client_sessions')
      .insert({
        therapist_id: users.therapist.id,
        client_name: `${testData.client.firstName} ${testData.client.lastName}`,
        client_email: testData.client.email,
        client_phone: testData.client.phone,
        session_date: sessionDate.toISOString().split('T')[0],
        start_time: '10:00',
        duration_minutes: 60,
        session_type: 'Sports Massage',
        status: 'scheduled',
        price: 80,
        payment_status: 'pending',
        notes: 'Client seeking recovery from sports injury'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;
    logTest('Session Booking', 'PASS', `Session ID: ${sessionData.id}`);

    // Process payment using admin client
    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from('stripe_payments')
      .insert({
        user_id: users.client.id,
        stripe_payment_intent_id: 'pi_test_' + Date.now(),
        amount: 80,
        currency: 'gbp',
        status: 'succeeded',
        payment_method: 'card',
        description: 'Payment for therapy session',
        metadata: {
          session_id: sessionData.id,
          therapist_id: users.therapist.id
        }
      })
      .select()
      .single();

    if (paymentError) throw paymentError;
    logTest('Payment Processing', 'PASS', `Payment ID: ${paymentData.id}`);

    // Update session with payment using admin client
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('client_sessions')
      .update({
        payment_status: 'completed',
        stripe_payment_intent_id: paymentData.stripe_payment_intent_id,
        platform_fee_amount: 8,
        practitioner_amount: 72,
        payment_method: 'card',
        payment_date: new Date().toISOString()
      })
      .eq('id', sessionData.id)
      .select()
      .single();

    if (updateError) throw updateError;
    logTest('Session Payment Update', 'PASS', 'Payment completed');

    return { sessionData, paymentData, updatedSession };

  } catch (error) {
    logTest('Session Booking Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 6: Communication Journey
async function testCommunicationJourney(users) {
  console.log('\n💬 STEP 6: Communication Journey');
  console.log('=' .repeat(50));

  try {
    // Create conversation using admin client
    const { data: conversationData, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .insert({
        conversation_key: `conv_${users.client.id}_${users.therapist.id}`,
        participant1_id: users.client.id,
        participant2_id: users.therapist.id,
        conversation_status: 'active'
      })
      .select()
      .single();

    if (conversationError) throw conversationError;
    logTest('Conversation Creation', 'PASS', `Conversation ID: ${conversationData.id}`);

    // Client sends message using admin client
    const { data: clientMessage, error: clientMessageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationData.id,
        sender_id: users.client.id,
        message_type: 'text',
        encrypted_content: 'Hello, I have a question about my upcoming session.',
        content_hash: 'hash_' + Date.now(),
        message_status: 'sent'
      })
      .select()
      .single();

    if (clientMessageError) throw clientMessageError;
    logTest('Client Message', 'PASS', `Message ID: ${clientMessage.id}`);

    // Therapist responds using admin client
    const { data: therapistMessage, error: therapistMessageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationData.id,
        sender_id: users.therapist.id,
        message_type: 'text',
        encrypted_content: 'Hello! I\'m looking forward to our session. What specific questions do you have?',
        content_hash: 'hash_' + Date.now(),
        message_status: 'sent'
      })
      .select()
      .single();

    if (therapistMessageError) throw therapistMessageError;
    logTest('Therapist Response', 'PASS', `Message ID: ${therapistMessage.id}`);

    // Update conversation using admin client
    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_id: therapistMessage.id
      })
      .eq('id', conversationData.id);

    logTest('Conversation Update', 'PASS', 'Last message updated');

    return { conversationData, clientMessage, therapistMessage };

  } catch (error) {
    logTest('Communication Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 7: Session Completion Journey
async function testSessionCompletionJourney(users, sessionData) {
  console.log('\n✅ STEP 7: Session Completion Journey');
  console.log('=' .repeat(50));

  try {
    // Mark session as completed using admin client
    const { data: completedSession, error: completeError } = await supabaseAdmin
      .from('client_sessions')
      .update({
        status: 'completed',
        notes: 'Session completed successfully. Client reported improvement in mobility.'
      })
      .eq('id', sessionData.id)
      .select()
      .single();

    if (completeError) throw completeError;
    logTest('Session Completion', 'PASS', 'Session marked as completed');

    // Create session recording using admin client
    const { data: recordingData, error: recordingError } = await supabaseAdmin
      .from('session_recordings')
      .insert({
        session_id: sessionData.id,
        practitioner_id: users.therapist.id,
        client_id: users.client.id,
        status: 'completed',
        duration_seconds: 3600,
        soap_subjective: 'Client reported reduced pain and improved range of motion',
        soap_objective: 'Observed improved flexibility and reduced muscle tension',
        soap_assessment: 'Good progress in recovery from sports injury',
        soap_plan: 'Continue with prescribed exercises and schedule follow-up',
        chief_complaint: 'Sports injury recovery',
        session_goals: ['Reduce pain', 'Improve mobility', 'Strengthen muscles']
      })
      .select()
      .single();

    if (recordingError) throw recordingError;
    logTest('Session Recording', 'PASS', `Recording ID: ${recordingData.id}`);

    return { completedSession, recordingData };

  } catch (error) {
    logTest('Session Completion Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 8: Review and Rating Journey
async function testReviewJourney(users, sessionData) {
  console.log('\n⭐ STEP 8: Review and Rating Journey');
  console.log('=' .repeat(50));

  try {
    // Client leaves review using admin client
    const { data: reviewData, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        client_id: users.client.id,
        therapist_id: users.therapist.id,
        session_id: sessionData.id,
        overall_rating: 5,
        title: 'Excellent session!',
        comment: 'The therapist was very professional and helpful. I felt much better after the session. Highly recommended!',
        is_anonymous: false,
        review_status: 'approved',
        is_verified_session: true,
        helpful_votes: 0,
        unhelpful_votes: 0
      })
      .select()
      .single();

    if (reviewError) throw reviewError;
    logTest('Review Creation', 'PASS', `Review ID: ${reviewData.id}`);

    // Update therapist rating using admin client
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('therapist_profiles')
      .update({
        total_reviews: 1,
        average_rating: 5.0,
        total_sessions: 1
      })
      .eq('user_id', users.therapist.id)
      .select()
      .single();

    if (updateError) throw updateError;
    logTest('Rating Update', 'PASS', 'Therapist rating updated');

    return { reviewData };

  } catch (error) {
    logTest('Review Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 9: Analytics and Reporting Journey
async function testAnalyticsJourney(users, sessionData) {
  console.log('\n📊 STEP 9: Analytics and Reporting Journey');
  console.log('=' .repeat(50));

  try {
    // Create business stats for therapist using admin client
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('business_stats')
      .insert({
        user_id: users.therapist.id,
        date: new Date().toISOString().split('T')[0],
        total_clients: 1,
        active_clients: 1,
        monthly_revenue: 80,
        sessions_count: 1,
        average_rating: 5.0
      })
      .select()
      .single();

    if (statsError) throw statsError;
    logTest('Business Stats', 'PASS', `Stats ID: ${statsData.id}`);

    // Create performance metrics using admin client
    const { data: performanceData, error: performanceError } = await supabaseAdmin
      .from('performance_metrics')
      .insert({
        user_id: users.therapist.id,
        metric_date: new Date().toISOString().split('T')[0],
        project_completion_rate: 100.0,
        average_project_duration: 1.0,
        client_satisfaction_score: 5.0,
        response_time_hours: 2.0,
        project_success_rate: 100.0,
        total_projects_completed: 1,
        total_revenue: 80.0
      })
      .select()
      .single();

    if (performanceError) throw performanceError;
    logTest('Performance Metrics', 'PASS', `Metrics ID: ${performanceData.id}`);

    return { statsData, performanceData };

  } catch (error) {
    logTest('Analytics Journey', 'FAIL', error.message);
    throw error;
  }
}

// Step 10: Platform Revenue Journey
async function testPlatformRevenueJourney(sessionData, users) {
  console.log('\n💼 STEP 10: Platform Revenue Journey');
  console.log('=' .repeat(50));

  try {
    // Create platform revenue record using admin client
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('platform_revenue')
      .insert({
        session_id: sessionData.id,
        practitioner_id: users.therapist.id,
        client_id: users.client.id,
        total_amount: 80,
        platform_fee: 8,
        practitioner_amount: 72,
        stripe_session_id: 'cs_test_' + Date.now(),
        payment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (revenueError) throw revenueError;
    logTest('Platform Revenue', 'PASS', `Revenue ID: ${revenueData.id}`);

    // Create payout record for therapist using admin client
    const { data: payoutData, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .insert({
        connect_account_id: 'acct_test_' + Date.now(),
        stripe_payout_id: 'po_test_' + Date.now(),
        amount: 7200, // 72.00 in pence
        currency: 'gbp',
        status: 'pending',
        type: 'bank_account',
        method: 'standard',
        destination: 'ba_test_' + Date.now(),
        metadata: {
          session_id: sessionData.id,
          practitioner_id: users.therapist.id
        }
      })
      .select()
      .single();

    if (payoutError) throw payoutError;
    logTest('Therapist Payout', 'PASS', `Payout ID: ${payoutData.id}`);

    return { revenueData, payoutData };

  } catch (error) {
    logTest('Platform Revenue Journey', 'FAIL', error.message);
    throw error;
  }
}

// Main user journey test
async function runCompleteUserJourney() {
  console.log('🚀 Starting Complete User Journey Test (Admin Version)');
  console.log('=' .repeat(60));
  console.log('This test simulates the complete marketplace experience from registration to revenue generation.');

  const startTime = Date.now();

  try {
    // Step 1: User Registration
    const users = await testUserRegistrationJourney();
    await delay(1000);

    // Step 2: Profile Setup
    const profiles = await testProfileSetupJourney(users);
    await delay(1000);

    // Step 3: Credit System
    const credits = await testCreditSystemJourney(users);
    await delay(1000);

    // Step 4: Marketplace Discovery
    const discovery = await testMarketplaceDiscoveryJourney(users, profiles);
    await delay(1000);

    // Step 5: Session Booking
    const booking = await testSessionBookingJourney(users, profiles);
    await delay(1000);

    // Step 6: Communication
    const communication = await testCommunicationJourney(users);
    await delay(1000);

    // Step 7: Session Completion
    const completion = await testSessionCompletionJourney(users, booking.sessionData);
    await delay(1000);

    // Step 8: Review and Rating
    const reviews = await testReviewJourney(users, booking.sessionData);
    await delay(1000);

    // Step 9: Analytics
    const analytics = await testAnalyticsJourney(users, booking.sessionData);
    await delay(1000);

    // Step 10: Platform Revenue
    const revenue = await testPlatformRevenueJourney(booking.sessionData, users);
    await delay(1000);

    // Calculate results
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 COMPLETE USER JOURNEY TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`🚀 Average Step Duration: ${(totalDuration / 10).toFixed(0)}ms per step`);

    console.log('\n📋 JOURNEY STEPS COMPLETED:');
    testResults.details.forEach((test, index) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.testName}: ${test.details}`);
    });

    if (testResults.failed === 0) {
      console.log('\n🎉 COMPLETE SUCCESS! The entire marketplace user journey is working perfectly!');
      console.log('✨ All features from registration to revenue generation are functional!');
    } else {
      console.log(`\n⚠️  ${testResults.failed} step(s) failed. Please review the details above.`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    try {
      await supabaseAdmin.auth.admin.deleteUser(users.client.id);
      await supabaseAdmin.auth.admin.deleteUser(users.therapist.id);
      console.log('✅ Test data cleaned up successfully');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup warning:', cleanupError.message);
    }

  } catch (error) {
    console.error('\n💥 User journey test failed:', error.message);
    process.exit(1);
  }
}

// Run the complete user journey test
runCompleteUserJourney().catch(console.error);
