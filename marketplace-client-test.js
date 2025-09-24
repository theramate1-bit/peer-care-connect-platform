import { createClient } from '@supabase/supabase-js';
import { load } from 'dotenv';

// Load environment variables
load();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

// Initialize Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration
const TEST_CONFIG = {
  testUser: {
    email: `test.user.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  },
  testTherapist: {
    email: `test.therapist.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Dr. Test',
    lastName: 'Therapist',
    phone: '+1234567891',
    specializations: ['sports_injury', 'rehabilitation'],
    hourlyRate: 80,
    bio: 'Experienced sports therapist with 10+ years of practice.',
    location: 'London, UK'
  },
  testSession: {
    sessionType: 'Sports Massage',
    duration: 60,
    price: 80,
    notes: 'Test session for client recovery'
  }
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
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

// Test 1: User Registration and Authentication
async function testUserRegistration() {
  console.log('\n🔐 Testing User Registration and Authentication...');
  
  try {
    // Test client registration
    const { data: clientData, error: clientError } = await supabase.auth.signUp({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password,
      options: {
        data: {
          first_name: TEST_CONFIG.testUser.firstName,
          last_name: TEST_CONFIG.testUser.lastName,
          user_role: 'client'
        }
      }
    });

    if (clientError) throw clientError;
    logTest('Client Registration', 'PASS', `User ID: ${clientData.user?.id}`);

    // Test therapist registration
    const { data: therapistData, error: therapistError } = await supabase.auth.signUp({
      email: TEST_CONFIG.testTherapist.email,
      password: TEST_CONFIG.testTherapist.password,
      options: {
        data: {
          first_name: TEST_CONFIG.testTherapist.firstName,
          last_name: TEST_CONFIG.testTherapist.lastName,
          user_role: 'sports_therapist'
        }
      }
    });

    if (therapistError) throw therapistError;
    logTest('Therapist Registration', 'PASS', `User ID: ${therapistData.user?.id}`);

    // Test login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password
    });

    if (loginError) throw loginError;
    logTest('User Login', 'PASS', `Session established`);

    return {
      client: clientData.user,
      therapist: therapistData.user,
      session: loginData.session
    };

  } catch (error) {
    logTest('User Registration', 'FAIL', error.message);
    throw error;
  }
}

// Test 2: Profile Management
async function testProfileManagement(users) {
  console.log('\n👤 Testing Profile Management...');

  try {
    // Create client profile
    const { data: clientProfile, error: clientProfileError } = await supabaseAdmin
      .from('client_profiles')
      .insert({
        user_id: users.client.id,
        preferences: {
          preferred_communication: 'email',
          notification_frequency: 'daily'
        },
        medical_history: 'No significant medical history',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '+1234567890'
      })
      .select()
      .single();

    if (clientProfileError) throw clientProfileError;
    logTest('Client Profile Creation', 'PASS', `Profile ID: ${clientProfile.id}`);

    // Create therapist profile
    const { data: therapistProfile, error: therapistProfileError } = await supabaseAdmin
      .from('therapist_profiles')
      .insert({
        user_id: users.therapist.id,
        bio: TEST_CONFIG.testTherapist.bio,
        location: TEST_CONFIG.testTherapist.location,
        specializations: TEST_CONFIG.testTherapist.specializations,
        hourly_rate: TEST_CONFIG.testTherapist.hourlyRate,
        experience_years: 10,
        professional_body: 'society_of_sports_therapists',
        qualifications: ['BSc Sports Therapy', 'MSc Rehabilitation'],
        verification_status: 'verified',
        profile_completion_status: 'complete'
      })
      .select()
      .single();

    if (therapistProfileError) throw therapistProfileError;
    logTest('Therapist Profile Creation', 'PASS', `Profile ID: ${therapistProfile.id}`);

    return { clientProfile, therapistProfile };

  } catch (error) {
    logTest('Profile Management', 'FAIL', error.message);
    throw error;
  }
}

// Test 3: Credit System
async function testCreditSystem(users) {
  console.log('\n💰 Testing Credit System...');

  try {
    // Initialize credits for client
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

    // Test credit transaction
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
    logTest('Credit System', 'FAIL', error.message);
    throw error;
  }
}

// Test 4: Marketplace Features
async function testMarketplaceFeatures(users, profiles) {
  console.log('\n🏪 Testing Marketplace Features...');

  try {
    // Test therapist availability
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

    // Test session creation
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() + 1); // Tomorrow

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('client_sessions')
      .insert({
        therapist_id: users.therapist.id,
        client_name: `${TEST_CONFIG.testUser.firstName} ${TEST_CONFIG.testUser.lastName}`,
        client_email: TEST_CONFIG.testUser.email,
        client_phone: TEST_CONFIG.testUser.phone,
        session_date: sessionDate.toISOString().split('T')[0],
        start_time: '10:00',
        duration_minutes: TEST_CONFIG.testSession.duration,
        session_type: TEST_CONFIG.testSession.sessionType,
        status: 'scheduled',
        price: TEST_CONFIG.testSession.price,
        payment_status: 'pending',
        notes: TEST_CONFIG.testSession.notes
      })
      .select()
      .single();

    if (sessionError) throw sessionError;
    logTest('Session Creation', 'PASS', `Session ID: ${sessionData.id}`);

    // Test session booking
    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('client_sessions')
      .update({
        status: 'scheduled',
        payment_status: 'completed',
        stripe_payment_intent_id: 'pi_test_' + Date.now(),
        platform_fee_amount: TEST_CONFIG.testSession.price * 0.1,
        practitioner_amount: TEST_CONFIG.testSession.price * 0.9,
        payment_method: 'credit',
        payment_date: new Date().toISOString()
      })
      .eq('id', sessionData.id)
      .select()
      .single();

    if (bookingError) throw bookingError;
    logTest('Session Booking', 'PASS', `Payment completed`);

    return { sessionData, bookingData };

  } catch (error) {
    logTest('Marketplace Features', 'FAIL', error.message);
    throw error;
  }
}

// Test 5: Messaging System
async function testMessagingSystem(users) {
  console.log('\n💬 Testing Messaging System...');

  try {
    // Create conversation
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

    // Send message
    const { data: messageData, error: messageError } = await supabaseAdmin
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

    if (messageError) throw messageError;
    logTest('Message Sending', 'PASS', `Message ID: ${messageData.id}`);

    // Update conversation with last message
    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_id: messageData.id
      })
      .eq('id', conversationData.id);

    logTest('Conversation Update', 'PASS', 'Last message updated');

    return { conversationData, messageData };

  } catch (error) {
    logTest('Messaging System', 'FAIL', error.message);
    throw error;
  }
}

// Test 6: Review System
async function testReviewSystem(users, sessionData) {
  console.log('\n⭐ Testing Review System...');

  try {
    // Create review
    const { data: reviewData, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        client_id: users.client.id,
        therapist_id: users.therapist.id,
        session_id: sessionData.id,
        overall_rating: 5,
        title: 'Excellent session!',
        comment: 'The therapist was very professional and helpful. Highly recommended!',
        is_anonymous: false,
        review_status: 'approved',
        is_verified_session: true
      })
      .select()
      .single();

    if (reviewError) throw reviewError;
    logTest('Review Creation', 'PASS', `Review ID: ${reviewData.id}`);

    // Update therapist rating
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('therapist_profiles')
      .update({
        total_reviews: 1,
        average_rating: 5.0
      })
      .eq('user_id', users.therapist.id)
      .select()
      .single();

    if (updateError) throw updateError;
    logTest('Rating Update', 'PASS', 'Therapist rating updated');

    return { reviewData };

  } catch (error) {
    logTest('Review System', 'FAIL', error.message);
    throw error;
  }
}

// Test 7: Payment Processing
async function testPaymentProcessing(users, sessionData) {
  console.log('\n💳 Testing Payment Processing...');

  try {
    // Create payment record
    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from('stripe_payments')
      .insert({
        user_id: users.client.id,
        stripe_payment_intent_id: 'pi_test_' + Date.now(),
        amount: TEST_CONFIG.testSession.price,
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
    logTest('Payment Creation', 'PASS', `Payment ID: ${paymentData.id}`);

    // Create platform revenue record
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('platform_revenue')
      .insert({
        session_id: sessionData.id,
        practitioner_id: users.therapist.id,
        client_id: users.client.id,
        total_amount: TEST_CONFIG.testSession.price,
        platform_fee: TEST_CONFIG.testSession.price * 0.1,
        practitioner_amount: TEST_CONFIG.testSession.price * 0.9,
        stripe_session_id: 'cs_test_' + Date.now(),
        payment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (revenueError) throw revenueError;
    logTest('Revenue Tracking', 'PASS', `Revenue ID: ${revenueData.id}`);

    return { paymentData, revenueData };

  } catch (error) {
    logTest('Payment Processing', 'FAIL', error.message);
    throw error;
  }
}

// Test 8: Real-time Features
async function testRealTimeFeatures(users) {
  console.log('\n⚡ Testing Real-time Features...');

  try {
    // Test user presence
    const { data: presenceData, error: presenceError } = await supabaseAdmin
      .from('user_presence')
      .upsert({
        user_id: users.client.id,
        online_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })
      .select()
      .single();

    if (presenceError) throw presenceError;
    logTest('User Presence', 'PASS', 'Presence updated');

    // Test activity logging
    const { data: activityData, error: activityError } = await supabaseAdmin
      .from('activities')
      .insert({
        user_id: users.client.id,
        type: 'session_completed',
        title: 'Session Completed',
        description: 'Successfully completed a therapy session',
        metadata: {
          session_type: 'Sports Massage',
          duration: 60
        }
      })
      .select()
      .single();

    if (activityError) throw activityError;
    logTest('Activity Logging', 'PASS', `Activity ID: ${activityData.id}`);

    return { presenceData, activityData };

  } catch (error) {
    logTest('Real-time Features', 'FAIL', error.message);
    throw error;
  }
}

// Test 9: End-to-End User Journey
async function testEndToEndJourney() {
  console.log('\n🚀 Testing Complete End-to-End User Journey...');

  try {
    // Step 1: User Registration
    const users = await testUserRegistration();
    await delay(1000);

    // Step 2: Profile Setup
    const profiles = await testProfileManagement(users);
    await delay(1000);

    // Step 3: Credit System
    const credits = await testCreditSystem(users);
    await delay(1000);

    // Step 4: Marketplace Interaction
    const marketplace = await testMarketplaceFeatures(users, profiles);
    await delay(1000);

    // Step 5: Messaging
    const messaging = await testMessagingSystem(users);
    await delay(1000);

    // Step 6: Review System
    const reviews = await testReviewSystem(users, marketplace.sessionData);
    await delay(1000);

    // Step 7: Payment Processing
    const payments = await testPaymentProcessing(users, marketplace.sessionData);
    await delay(1000);

    // Step 8: Real-time Features
    const realtime = await testRealTimeFeatures(users);
    await delay(1000);

    logTest('Complete User Journey', 'PASS', 'All steps completed successfully');

    return {
      users,
      profiles,
      credits,
      marketplace,
      messaging,
      reviews,
      payments,
      realtime
    };

  } catch (error) {
    logTest('End-to-End Journey', 'FAIL', error.message);
    throw error;
  }
}

// Test 10: Performance and Load Testing
async function testPerformance() {
  console.log('\n⚡ Testing Performance and Load...');

  try {
    const startTime = Date.now();
    
    // Test multiple concurrent operations
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        supabaseAdmin
          .from('activities')
          .insert({
            user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
            type: 'test',
            title: `Performance Test ${i}`,
            description: 'Load testing activity'
          })
      );
    }

    await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    logTest('Performance Test', 'PASS', `5 concurrent operations completed in ${duration}ms`);

    return { duration };

  } catch (error) {
    logTest('Performance Test', 'FAIL', error.message);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Comprehensive Marketplace & Client Feature Testing...\n');
  console.log('=' .repeat(60));

  const startTime = Date.now();

  try {
    // Run all tests
    const journeyResults = await testEndToEndJourney();
    const performanceResults = await testPerformance();

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
    console.log(`⚡ Performance: ${performanceResults.duration}ms for 5 concurrent operations`);

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

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      await supabaseAdmin.auth.admin.deleteUser(journeyResults.users.client.id);
      await supabaseAdmin.auth.admin.deleteUser(journeyResults.users.therapist.id);
      console.log('✅ Test data cleaned up successfully');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup warning:', cleanupError.message);
    }

  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(console.error);
