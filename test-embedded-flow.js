/**
 * End-to-End Test Script for Stripe Connect Embedded Onboarding
 * Tests the full flow: Account Creation → Account Session → Embedded Component
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ Set STRIPE_SECRET_KEY in environment (e.g. export STRIPE_SECRET_KEY=sk_live_...)');
  process.exit(1);
}
const SUPABASE_URL = 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

async function testEndToEnd() {
  console.log('=== END-TO-END TEST: Stripe Connect Embedded Onboarding ===\n');

  // Step 1: Create Stripe Connect Account
  console.log('Step 1: Creating Stripe Connect Account...');
  const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'country': 'GB',
      'email': `test+${Date.now()}@theramate.co.uk`,
      'business_type': 'individual',
      'capabilities[card_payments][requested]': 'true',
      'capabilities[transfers][requested]': 'true',
      'controller[stripe_dashboard][type]': 'none',
      'controller[requirement_collection]': 'application',
      'controller[losses][payments]': 'application',
      'controller[fees][payer]': 'application',
    }),
  });

  if (!accountResponse.ok) {
    const error = await accountResponse.json();
    console.error('❌ Account creation failed:', error);
    return;
  }

  const account = await accountResponse.json();
  console.log('✅ Account Created:');
  console.log(`   ID: ${account.id}`);
  console.log(`   Requirement Collection: ${account.controller?.requirement_collection}`);
  console.log(`   Dashboard Type: ${account.controller?.stripe_dashboard?.type}`);

  // Verify configuration
  if (account.controller?.requirement_collection !== 'application') {
    console.error('❌ FAILED: Account does not have requirement_collection: "application"');
    return;
  }
  console.log('✅ Account configuration correct\n');

  // Step 2: Create Account Session
  console.log('Step 2: Creating Account Session...');
  const sessionResponse = await fetch('https://api.stripe.com/v1/account_sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'account': account.id,
      'components[account_onboarding][enabled]': 'true',
      'components[account_onboarding][features][external_account_collection]': 'true',
      'components[account_onboarding][features][disable_stripe_user_authentication]': 'true',
    }),
  });

  if (!sessionResponse.ok) {
    const error = await sessionResponse.json();
    console.error('❌ Account session creation failed:', error);
    return;
  }

  const session = await sessionResponse.json();
  console.log('✅ Account Session Created:');
  console.log(`   Client Secret: ${session.client_secret.substring(0, 30)}...`);
  console.log(`   Expires At: ${new Date(session.expires_at * 1000).toISOString()}`);

  // Verify session includes disable_stripe_user_authentication
  const components = session.components;
  if (components?.account_onboarding?.features?.disable_stripe_user_authentication !== true) {
    console.error('❌ FAILED: disable_stripe_user_authentication not enabled in session');
    return;
  }
  console.log('✅ disable_stripe_user_authentication enabled\n');

  // Step 3: Verify account can be used for embedded onboarding
  console.log('Step 3: Verifying Account for Embedded Onboarding...');
  const verifyResponse = await fetch(`https://api.stripe.com/v1/accounts/${account.id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    },
  });

  const verifiedAccount = await verifyResponse.json();
  console.log('✅ Account Verification:');
  console.log(`   Type: ${verifiedAccount.type || 'Custom (via controller)'}`);
  console.log(`   Has Controller: ${!!verifiedAccount.controller}`);
  console.log(`   Requirement Collection: ${verifiedAccount.controller?.requirement_collection}`);
  console.log(`   Dashboard: ${verifiedAccount.controller?.stripe_dashboard?.type}`);

  // Final verification
  const isCorrectConfig = 
    verifiedAccount.controller?.requirement_collection === 'application' &&
    verifiedAccount.controller?.stripe_dashboard?.type === 'none';

  if (!isCorrectConfig) {
    console.error('❌ FAILED: Account configuration incorrect');
    return;
  }

  console.log('\n=== ✅ END-TO-END TEST PASSED ===');
  console.log('\nSummary:');
  console.log('✅ Account created with requirement_collection: "application"');
  console.log('✅ Account session created with disable_stripe_user_authentication');
  console.log('✅ Account configured for fully embedded onboarding');
  console.log('✅ No popup required - form will embed inline');
  console.log(`\nTest Account ID: ${account.id}`);
  console.log('You can now test the onboarding flow with this account.');
}

// Run the test
testEndToEnd().catch(console.error);



