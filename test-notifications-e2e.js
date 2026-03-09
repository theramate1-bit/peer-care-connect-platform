/**
 * End-to-End Notification System Test
 * Tests notifications for practitioner user "theramate1"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

// Create Supabase client with anon key for testing (will use RPC which respects RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  total: 0
};

function logTest(name, status, message = '') {
  testResults.total++;
  const result = { name, status, message, timestamp: new Date().toISOString() };
  
  if (status === 'PASS') {
    testResults.passed.push(result);
    console.log(`✅ ${name}: ${message || 'PASS'}`);
  } else {
    testResults.failed.push(result);
    console.log(`❌ ${name}: ${message || 'FAIL'}`);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Find theramate1 user
 */
async function findTheramate1User() {
  console.log('\n🔍 TEST 1: Finding theramate1 practitioner user...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, user_role')
      .or('email.eq.theramate1@theramate.co.uk,email.eq.theramate1@gmail.com')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Try searching by first_name or username pattern
      const { data: users } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, user_role')
        .ilike('email', '%theramate1%')
        .limit(5);

      if (users && users.length > 0) {
        logTest('Find theramate1 user', 'PASS', `Found user: ${users[0].email} (${users[0].id})`);
        return users[0];
      } else {
        logTest('Find theramate1 user', 'FAIL', 'User theramate1 not found');
        return null;
      }
    }

    logTest('Find theramate1 user', 'PASS', `Found user: ${data.email} (${data.id})`);
    return data;
  } catch (error) {
    logTest('Find theramate1 user', 'FAIL', error.message);
    return null;
  }
}

/**
 * Test 2: Create test notification for theramate1
 */
async function testCreateNotification(userId) {
  console.log('\n🔔 TEST 2: Creating notification for theramate1...');
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_recipient_id: userId,
      p_type: 'test_notification',
      p_title: 'Test Notification for theramate1',
      p_body: 'This is a test notification to verify the notification system is working correctly.',
      p_payload: {
        test: true,
        timestamp: new Date().toISOString()
      },
      p_source_type: 'test',
      p_source_id: `test-${Date.now()}`
    });

    if (error) throw error;

    logTest('Create notification', 'PASS', `Notification created: ${data}`);
    return data;
  } catch (error) {
    logTest('Create notification', 'FAIL', error.message);
    return null;
  }
}

/**
 * Test 3: Fetch notifications for theramate1
 */
async function testFetchNotifications(userId) {
  console.log('\n📥 TEST 3: Fetching notifications for theramate1...');
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    logTest('Fetch notifications', 'PASS', `Found ${data.length} notifications`);
    return data;
  } catch (error) {
    logTest('Fetch notifications', 'FAIL', error.message);
    return null;
  }
}

/**
 * Test 4: Check unread count
 */
async function testUnreadCount(userId) {
  console.log('\n📊 TEST 4: Checking unread notification count...');
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) throw error;

    const unreadCount = data.length;
    logTest('Unread count', 'PASS', `${unreadCount} unread notifications`);
    return unreadCount;
  } catch (error) {
    logTest('Unread count', 'FAIL', error.message);
    return 0;
  }
}

/**
 * Test 5: Mark notification as read
 */
async function testMarkAsRead(userId) {
  console.log('\n✅ TEST 5: Marking notification as read...');
  try {
    // Get first unread notification
    const { data: unreadNotif, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', userId)
      .is('read_at', null)
      .limit(1)
      .single();

    if (fetchError || !unreadNotif) {
      logTest('Mark as read', 'SKIP', 'No unread notifications to mark');
      return true;
    }

    // Mark as read
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', unreadNotif.id);

    if (error) throw error;

    // Verify it's marked as read
    const { data: updated } = await supabase
      .from('notifications')
      .select('read_at')
      .eq('id', unreadNotif.id)
      .single();

    if (updated && updated.read_at) {
      logTest('Mark as read', 'PASS', `Notification ${unreadNotif.id} marked as read`);
      return true;
    } else {
      logTest('Mark as read', 'FAIL', 'Notification not marked as read');
      return false;
    }
  } catch (error) {
    logTest('Mark as read', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 6: Mark all as read using RPC
 */
async function testMarkAllAsRead(userId) {
  console.log('\n✅ TEST 6: Marking all notifications as read...');
  try {
    // Get all unread notification IDs
    const { data: unreadNotifs, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (fetchError) throw fetchError;

    if (!unreadNotifs || unreadNotifs.length === 0) {
      logTest('Mark all as read', 'SKIP', 'No unread notifications');
      return true;
    }

    const notificationIds = unreadNotifs.map(n => n.id);

    // Use RPC function
    const { data, error } = await supabase.rpc('mark_notifications_read', {
      p_ids: notificationIds
    });

    if (error) throw error;

    logTest('Mark all as read', 'PASS', `${data} notifications marked as read`);
    return true;
  } catch (error) {
    logTest('Mark all as read', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 7: Create booking notification
 */
async function testBookingNotification(userId) {
  console.log('\n📅 TEST 7: Creating booking notification...');
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_recipient_id: userId,
      p_type: 'new_booking',
      p_title: 'New Booking Received',
      p_body: 'Test Client has booked a Sports Therapy session on 2025-01-25 at 10:00',
      p_payload: {
        session_id: 'test-session-123',
        client_name: 'Test Client',
        session_date: '2025-01-25',
        start_time: '10:00'
      },
      p_source_type: 'booking',
      p_source_id: 'test-session-123'
    });

    if (error) throw error;

    logTest('Booking notification', 'PASS', `Notification created: ${data}`);
    return data;
  } catch (error) {
    logTest('Booking notification', 'FAIL', error.message);
    return null;
  }
}

/**
 * Test 8: Create message notification
 */
async function testMessageNotification(userId) {
  console.log('\n💬 TEST 8: Creating message notification...');
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_recipient_id: userId,
      p_type: 'new_message',
      p_title: 'New Message',
      p_body: 'Test Client: Hello, I have a question about...',
      p_payload: {
        conversation_id: 'test-conv-123',
        sender_id: 'test-sender-id',
        sender_name: 'Test Client'
      },
      p_source_type: 'message',
      p_source_id: 'test-conv-123'
    });

    if (error) throw error;

    logTest('Message notification', 'PASS', `Notification created: ${data}`);
    return data;
  } catch (error) {
    logTest('Message notification', 'FAIL', error.message);
    return null;
  }
}

/**
 * Test 9: Test idempotency (same source_type + source_id)
 */
async function testNotificationIdempotency(userId) {
  console.log('\n🔄 TEST 9: Testing notification idempotency...');
  try {
    const sourceId = `idempotency-test-${Date.now()}`;
    
    // Create first notification
    const { data: first, error: firstError } = await supabase.rpc('create_notification', {
      p_recipient_id: userId,
      p_type: 'test',
      p_title: 'First Notification',
      p_body: 'First notification',
      p_source_type: 'test',
      p_source_id: sourceId
    });

    if (firstError) throw firstError;

    // Try to create same notification again (should return same ID)
    const { data: second, error: secondError } = await supabase.rpc('create_notification', {
      p_recipient_id: userId,
      p_type: 'test',
      p_title: 'Second Notification',
      p_body: 'Second notification',
      p_source_type: 'test',
      p_source_id: sourceId
    });

    if (secondError) throw secondError;

    if (first === second) {
      logTest('Notification idempotency', 'PASS', `Same ID returned: ${first}`);
      return true;
    } else {
      logTest('Notification idempotency', 'FAIL', `Different IDs: ${first} vs ${second}`);
      return false;
    }
  } catch (error) {
    logTest('Notification idempotency', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 10: Verify schema fields
 */
async function testNotificationSchema(userId) {
  console.log('\n📋 TEST 10: Verifying notification schema...');
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, recipient_id, type, title, body, payload, read_at, created_at')
      .eq('recipient_id', userId)
      .limit(1)
      .single();

    if (error) throw error;

    const requiredFields = ['id', 'recipient_id', 'type', 'title', 'body', 'created_at'];
    const missingFields = requiredFields.filter(field => !(field in data));

    if (missingFields.length > 0) {
      logTest('Notification schema', 'FAIL', `Missing fields: ${missingFields.join(', ')}`);
      return false;
    }

    logTest('Notification schema', 'PASS', 'All required fields present');
    return true;
  } catch (error) {
    logTest('Notification schema', 'FAIL', error.message);
    return false;
  }
}

/**
 * Test 11: Check notification preferences
 */
async function testNotificationPreferences(userId) {
  console.log('\n⚙️ TEST 11: Checking notification preferences...');
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      logTest('Notification preferences', 'PASS', `Preferences found: in_app=${data.in_app}, email=${data.email}`);
    } else {
      logTest('Notification preferences', 'SKIP', 'No preferences set (will use defaults)');
    }

    return data;
  } catch (error) {
    logTest('Notification preferences', 'FAIL', error.message);
    return null;
  }
}

/**
 * Main test runner
 */
async function runNotificationTests() {
  console.log('🧪 NOTIFICATION SYSTEM END-TO-END TEST');
  console.log('=' .repeat(60));
  console.log('Testing for practitioner user: theramate1');
  console.log('=' .repeat(60));

  try {
    // Test 1: Find user
    const user = await findTheramate1User();
    if (!user) {
      console.log('\n❌ Cannot proceed - user not found');
      return;
    }

    const userId = user.id;
    console.log(`\n✓ Testing with user: ${user.email} (${userId})\n`);

    // Run all tests
    await testCreateNotification(userId);
    await delay(500);

    await testFetchNotifications(userId);
    await delay(500);

    await testUnreadCount(userId);
    await delay(500);

    await testMarkAsRead(userId);
    await delay(500);

    await testMarkAllAsRead(userId);
    await delay(500);

    await testBookingNotification(userId);
    await delay(500);

    await testMessageNotification(userId);
    await delay(500);

    await testNotificationIdempotency(userId);
    await delay(500);

    await testNotificationSchema(userId);
    await delay(500);

    await testNotificationPreferences(userId);
    await delay(500);

    // Final summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);
    console.log(`⏭️  Skipped: ${testResults.total - testResults.passed.length - testResults.failed.length}`);

    if (testResults.failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.failed.forEach(test => {
        console.log(`  - ${test.name}: ${test.message}`);
      });
    }

    // Final verification - fetch all notifications
    console.log('\n📋 FINAL VERIFICATION:');
    const { data: allNotifications } = await supabase
      .from('notifications')
      .select('id, type, title, read_at, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`Total notifications for ${user.email}: ${allNotifications?.length || 0}`);
    if (allNotifications && allNotifications.length > 0) {
      console.log('\nRecent notifications:');
      allNotifications.forEach((notif, idx) => {
        const readStatus = notif.read_at ? '✓ Read' : '○ Unread';
        console.log(`  ${idx + 1}. [${readStatus}] ${notif.type}: ${notif.title}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log(testResults.failed.length === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ TEST SUITE ERROR:', error);
    process.exit(1);
  }
}

// Run tests
runNotificationTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

