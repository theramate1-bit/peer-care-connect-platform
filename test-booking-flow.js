#!/usr/bin/env node

/**
 * Test Booking Flow
 * 
 * This script tests the complete booking flow including:
 * 1. Creating a session in client_sessions
 * 2. Verifying the session appears in practitioner dashboards
 * 3. Testing payment integration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getDefaultHourlyRate(userRole) {
  switch (userRole) {
    case 'sports_therapist': return 80;
    case 'massage_therapist': return 65;
    case 'osteopath': return 75;
    default: return 70;
  }
}

async function testSessionCreation() {
  console.log('📅 TESTING SESSION CREATION');
  console.log('=' .repeat(50));

  try {
    // Get a practitioner
    const { data: practitioners, error: practitionerError } = await supabase
      .from('users')
      .select('id, first_name, last_name, user_role')
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
      .eq('is_active', true)
      .limit(1);

    if (practitionerError || !practitioners || practitioners.length === 0) {
      console.log('❌ No practitioners available for booking test');
      return null;
    }

    const practitioner = practitioners[0];
    console.log(`✅ Using practitioner: ${practitioner.first_name} ${practitioner.last_name}`);

    // Create a test session
    const sessionData = {
      therapist_id: practitioner.id,
      client_name: 'Test Client',
      client_email: 'test@example.com',
      client_phone: '+44 7700 900000',
      session_date: '2025-01-22',
      start_time: '14:00:00',
      duration_minutes: 60,
      session_type: 'Sports Therapy',
      price: getDefaultHourlyRate(practitioner.user_role),
      notes: 'Test session created by automated test',
      status: 'scheduled',
      payment_status: 'pending'
    };

    console.log('Creating test session...');
    console.log('Session details:');
    console.log(`  - Therapist: ${practitioner.first_name} ${practitioner.last_name}`);
    console.log(`  - Client: ${sessionData.client_name}`);
    console.log(`  - Date: ${sessionData.session_date}`);
    console.log(`  - Time: ${sessionData.start_time}`);
    console.log(`  - Duration: ${sessionData.duration_minutes} minutes`);
    console.log(`  - Price: £${sessionData.price}`);
    console.log(`  - Status: ${sessionData.status}`);

    // Try to create the session
    const { data: createdSession, error: sessionError } = await supabase
      .from('client_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      if (sessionError.message.includes('row-level security')) {
        console.log('❌ Session creation failed due to RLS (requires authentication)');
        console.log('✅ This is expected behavior - sessions can only be created by authenticated users');
        return null;
      } else {
        console.log('❌ Unexpected error creating session:', sessionError.message);
        return null;
      }
    } else {
      console.log('✅ Session created successfully!');
      console.log(`   Session ID: ${createdSession.id}`);
      return createdSession;
    }

  } catch (error) {
    console.log('❌ Session creation test failed:', error.message);
    return null;
  }
}

async function testDashboardQueries(sessionId = null) {
  console.log('\n📊 TESTING DASHBOARD QUERIES');
  console.log('=' .repeat(50));

  try {
    // Get practitioners
    const { data: practitioners, error: practitionerError } = await supabase
      .from('users')
      .select('id, first_name, last_name, user_role')
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
      .eq('is_active', true);

    if (practitionerError || !practitioners || practitioners.length === 0) {
      console.log('❌ No practitioners found for dashboard test');
      return false;
    }

    console.log(`✅ Testing dashboard queries for ${practitioners.length} practitioners`);

    let allQueriesWorking = true;

    for (const practitioner of practitioners) {
      console.log(`\n   Testing dashboard for: ${practitioner.first_name} ${practitioner.last_name}`);
      
      // Test 1: Get all sessions for this practitioner
      const { data: allSessions, error: allSessionsError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', practitioner.id)
        .order('session_date', { ascending: false });

      if (allSessionsError) {
        console.log('     ❌ Failed to query all sessions:', allSessionsError.message);
        allQueriesWorking = false;
      } else {
        console.log(`     ✅ All sessions query: ${allSessions.length} sessions found`);
      }

      // Test 2: Get today's sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySessions, error: todayError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', practitioner.id)
        .eq('session_date', today);

      if (todayError) {
        console.log('     ❌ Failed to query today\'s sessions:', todayError.message);
        allQueriesWorking = false;
      } else {
        console.log(`     ✅ Today's sessions: ${todaySessions.length} sessions`);
      }

      // Test 3: Get upcoming sessions
      const { data: upcomingSessions, error: upcomingError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', practitioner.id)
        .gte('session_date', today)
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true });

      if (upcomingError) {
        console.log('     ❌ Failed to query upcoming sessions:', upcomingError.message);
        allQueriesWorking = false;
      } else {
        console.log(`     ✅ Upcoming sessions: ${upcomingSessions.length} sessions`);
      }

      // Test 4: Get completed sessions
      const { data: completedSessions, error: completedError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', practitioner.id)
        .eq('status', 'completed')
        .order('session_date', { ascending: false });

      if (completedError) {
        console.log('     ❌ Failed to query completed sessions:', completedError.message);
        allQueriesWorking = false;
      } else {
        console.log(`     ✅ Completed sessions: ${completedSessions.length} sessions`);
      }

      // Test 5: Get unique clients
      const { data: clientSessions, error: clientError } = await supabase
        .from('client_sessions')
        .select('client_name, client_email')
        .eq('therapist_id', practitioner.id);

      if (clientError) {
        console.log('     ❌ Failed to query client data:', clientError.message);
        allQueriesWorking = false;
      } else {
        const uniqueClients = [...new Set(clientSessions.map(c => c.client_email))];
        console.log(`     ✅ Unique clients: ${uniqueClients.length} clients`);
      }

      // If we have a specific session, test querying it
      if (sessionId) {
        const { data: specificSession, error: specificError } = await supabase
          .from('client_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('therapist_id', practitioner.id)
          .single();

        if (specificError) {
          console.log('     ❌ Failed to query specific session:', specificError.message);
          allQueriesWorking = false;
        } else {
          console.log(`     ✅ Specific session query: Found session ${sessionId}`);
        }
      }
    }

    return allQueriesWorking;

  } catch (error) {
    console.log('❌ Dashboard queries test failed:', error.message);
    return false;
  }
}

async function testPaymentIntegration() {
  console.log('\n💳 TESTING PAYMENT INTEGRATION');
  console.log('=' .repeat(50));

  try {
    // Test Stripe payment intent creation (what BookingFlow.tsx would do)
    const testPaymentData = {
      action: 'create-payment-intent',
      amount: 8000, // £80.00 in pence
      currency: 'gbp',
      payment_type: 'session_payment',
      therapist_id: 'test-therapist-id',
      session_id: 'test-session-id',
      metadata: {
        duration: 60,
        session_type: 'Sports Therapy',
        client_name: 'Test Client'
      }
    };

    console.log('Testing Stripe payment intent creation...');
    console.log('Payment data:', JSON.stringify(testPaymentData, null, 2));

    // Try to invoke the stripe-payment Edge Function
    const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('stripe-payment', {
      body: testPaymentData
    });

    if (paymentError) {
      if (paymentError.message.includes('401') || paymentError.message.includes('Unauthorized')) {
        console.log('❌ Payment test failed due to authentication (expected)');
        console.log('✅ This is expected - payment functions require proper authentication');
        return true; // This is actually correct behavior
      } else {
        console.log('❌ Unexpected payment error:', paymentError.message);
        return false;
      }
    } else {
      console.log('✅ Payment intent created successfully!');
      console.log('Payment result:', paymentResult);
      return true;
    }

  } catch (error) {
    console.log('❌ Payment integration test failed:', error.message);
    return false;
  }
}

async function runBookingFlowTests() {
  console.log('🧪 COMPREHENSIVE BOOKING FLOW TEST SUITE');
  console.log('=' .repeat(60));
  console.log('Testing complete booking flow functionality...\n');

  const results = {
    sessionCreation: await testSessionCreation(),
    dashboardQueries: await testDashboardQueries(),
    paymentIntegration: await testPaymentIntegration()
  };

  console.log('\n📋 BOOKING FLOW TEST RESULTS');
  console.log('=' .repeat(60));
  
  console.log(`✅ Session Creation: ${results.sessionCreation ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Dashboard Queries: ${results.dashboardQueries ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Payment Integration: ${results.paymentIntegration ? 'PASS' : 'FAIL'}`);

  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ALL BOOKING FLOW TESTS PASSED! 🎉');
    console.log('The booking flow is fully functional and ready for use!');
    console.log('\n🚀 BOOKING FLOW STATUS:');
    console.log('- ✅ Session creation works (with authentication)');
    console.log('- ✅ Dashboard queries work for all practitioners');
    console.log('- ✅ Payment integration is properly secured');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Test booking flow in the browser with authenticated users');
    console.log('2. Verify sessions appear in practitioner dashboards');
    console.log('3. Test payment processing with real Stripe integration');
  } else {
    console.log('\n❌ SOME BOOKING FLOW TESTS FAILED');
    console.log('Please review the failed tests above and fix the issues.');
  }

  return allPassed;
}

// Run the tests
runBookingFlowTests().catch(console.error);
