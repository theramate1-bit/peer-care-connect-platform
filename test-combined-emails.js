/**
 * Test script for combined email templates
 * Tests the optimized booking + payment confirmation emails
 */

const SUPABASE_URL = 'https://aikqnvltuwwgifuocvto.supabase.co'
const TEST_EMAIL = 'rayman196823@gmail.com'

// Get service role key from environment or use anon key for testing
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function testEmail(emailType, payload) {
  console.log(`\n🧪 Testing: ${emailType}`)
  console.log('─'.repeat(60))
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log(`✅ SUCCESS`)
      console.log(`   Email ID: ${result.emailId}`)
      console.log(`   Subject: ${payload.emailType}`)
      console.log(`   Sent to: ${payload.recipientEmail}`)
      return { success: true, emailId: result.emailId }
    } else {
      console.log(`❌ FAILED`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${JSON.stringify(result, null, 2)}`)
      return { success: false, error: result }
    }
  } catch (error) {
    console.log(`❌ ERROR`)
    console.log(`   ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🚀 Testing Combined Email Templates')
  console.log('='.repeat(60))
  
  const results = []
  
  // Test 1: Combined Client Booking + Payment Confirmation
  const clientBookingPayload = {
    emailType: 'booking_confirmation_client',
    recipientEmail: TEST_EMAIL,
    recipientName: 'Test Client',
    data: {
      sessionId: 'test-session-123',
      sessionType: 'Massage Therapy',
      sessionDate: '2025-02-20',
      sessionTime: '14:00',
      sessionDuration: 60,
      sessionPrice: 50,
      sessionLocation: '123 Test Street, London',
      practitionerName: 'Jane Practitioner',
      paymentAmount: 50,
      paymentId: 'pi_test_1234567890',
      bookingUrl: 'https://theramate.co.uk/client/sessions',
      messageUrl: 'https://theramate.co.uk/messages',
      clientHasAccount: true
    }
  }
  
  results.push(await testEmail('booking_confirmation_client (COMBINED)', clientBookingPayload))
  
  // Wait 2 seconds to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Test 2: Combined Practitioner Booking + Payment Confirmation
  const practitionerBookingPayload = {
    emailType: 'booking_confirmation_practitioner',
    recipientEmail: TEST_EMAIL,
    recipientName: 'Jane Practitioner',
    data: {
      sessionId: 'test-session-123',
      sessionType: 'Massage Therapy',
      sessionDate: '2025-02-20',
      sessionTime: '14:00',
      sessionDuration: 60,
      sessionPrice: 50,
      clientName: 'Test Client',
      clientEmail: 'testclient@example.com',
      paymentAmount: 50,
      platformFee: 0.25,
      practitionerAmount: 49.75,
      paymentId: 'pi_test_1234567890',
      paymentStatus: 'completed',
      bookingUrl: 'https://theramate.co.uk/practice/sessions/test-session-123',
      messageUrl: 'https://theramate.co.uk/messages'
    }
  }
  
  results.push(await testEmail('booking_confirmation_practitioner (COMBINED)', practitionerBookingPayload))
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  
  console.log(`✅ Passed: ${successCount}/${results.length}`)
  console.log(`❌ Failed: ${failCount}/${results.length}`)
  
  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Combined emails are working correctly.')
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.')
  }
  
  return results
}

// Run tests if executed directly
runTests().catch(console.error)

export { runTests, testEmail }
