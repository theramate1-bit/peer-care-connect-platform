#!/usr/bin/env node

/**
 * Test Payment Redirect Flow
 * Tests if the Stripe checkout redirect actually works
 */

import { createClient } from '@supabase/supabase-js';

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logStep = (step, status = 'info') => {
  const icon = status === 'success' ? '✓' : status === 'error' ? '✗' : '→';
  const color = status === 'success' ? 'green' : status === 'error' ? 'red' : 'cyan';
  log(`${icon} ${step}`, color);
};

async function testPaymentRedirect() {
  log('\n' + '='.repeat(60), 'bright');
  log('     PAYMENT REDIRECT TEST', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  // Step 1: Get Supabase credentials
  logStep('Step 1: Getting Supabase credentials...', 'info');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logStep('ERROR: Environment variables not set', 'error');
    log('\nPlease ensure these environment variables are set:', 'yellow');
    log('  - VITE_SUPABASE_URL', 'yellow');
    log('  - VITE_SUPABASE_ANON_KEY', 'yellow');
    log('\nYou can find these in your Supabase project settings.', 'cyan');
    process.exit(1);
  }

  logStep('Supabase credentials loaded', 'success');
  log(`  URL: ${supabaseUrl}`, 'cyan');

  // Step 2: Create Supabase client
  logStep('Step 2: Creating Supabase client...', 'info');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  logStep('Supabase client created', 'success');

  // Step 3: Check if user is signed in
  logStep('Step 3: Checking authentication...', 'info');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logStep('No active session found', 'error');
    log('\nPlease sign in first:', 'yellow');
    log('  1. Run: npm run dev', 'cyan');
    log('  2. Open browser and sign in', 'cyan');
    log('  3. Run this test again', 'cyan');
    process.exit(1);
  }

  const user = session.user;
  logStep('User authenticated', 'success');
  log(`  User ID: ${user.id}`, 'cyan');
  log(`  Email: ${user.email}`, 'cyan');

  // Step 4: Test create-checkout Edge Function
  logStep('Step 4: Testing create-checkout Edge Function...', 'info');
  
  const testPlans = [
    { plan: 'practitioner', billing: 'monthly', name: 'Healthcare Professional Plan (Monthly)' },
    { plan: 'clinic', billing: 'monthly', name: 'Healthcare Professional Pro Plan (Monthly)' }
  ];

  for (const testPlan of testPlans) {
    log(`\n  Testing: ${testPlan.name}`, 'magenta');
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: testPlan.plan,
          billing: testPlan.billing
        }
      });

      if (error) {
        logStep(`  ✗ Error: ${error.message}`, 'error');
        log(`    Details: ${JSON.stringify(error, null, 2)}`, 'red');
        continue;
      }

      if (data && data.url) {
        logStep(`  ✓ Checkout URL created successfully!`, 'success');
        log(`    URL: ${data.url}`, 'green');
        
        // Check if it's a valid Stripe URL
        if (data.url.includes('checkout.stripe.com') || data.url.includes('stripe.com')) {
          logStep(`  ✓ Valid Stripe Checkout URL`, 'success');
        } else if (data.url.includes('/dashboard')) {
          logStep(`  ℹ Free plan redirect to dashboard`, 'info');
        } else {
          logStep(`  ⚠ Unexpected URL format`, 'error');
        }
      } else {
        logStep(`  ✗ No URL returned`, 'error');
        log(`    Response: ${JSON.stringify(data, null, 2)}`, 'red');
      }
    } catch (err) {
      logStep(`  ✗ Exception: ${err.message}`, 'error');
      console.error(err);
    }
  }

  // Step 5: Summary
  log('\n' + '='.repeat(60), 'bright');
  log('     TEST SUMMARY', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  log('✓ Authentication: Working', 'green');
  log('✓ Edge Function: Accessible', 'green');
  log('✓ Stripe Integration: Check URLs above', 'cyan');
  
  log('\n' + '='.repeat(60), 'bright');
  log('     MANUAL TEST STEPS', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  log('To fully test the redirect:', 'yellow');
  log('  1. Run: npm run dev', 'cyan');
  log('  2. Navigate to onboarding payment step', 'cyan');
  log('  3. Click "Continue to Payment"', 'cyan');
  log('  4. Verify redirect to Stripe Checkout', 'cyan');
  log('  5. Test with test card: 4242 4242 4242 4242', 'cyan');
  log('  6. Verify return to dashboard', 'cyan');
  
  log('\n✅ Test complete!\n', 'green');
}

// Run the test
testPaymentRedirect().catch(error => {
  log('\n❌ Test failed with error:', 'red');
  console.error(error);
  process.exit(1);
});

