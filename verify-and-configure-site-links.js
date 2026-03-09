import https from 'https';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ Set STRIPE_SECRET_KEY in environment');
  process.exit(1);
}
const REQUIRED_URL = 'https://theramate.co.uk/settings/payouts';

function makeStripeRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, 'https://api.stripe.com');
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsed });
          } else {
            reject({ statusCode: res.statusCode, error: parsed });
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, error: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function checkAccountStatus() {
  try {
    console.log('📊 Checking Stripe account status...\n');
    const result = await makeStripeRequest('/v1/account');
    console.log('✅ Account retrieved successfully');
    console.log('Account ID:', result.data.id);
    console.log('Country:', result.data.country);
    console.log('Type:', result.data.type);
    console.log('');
    return result.data;
  } catch (error) {
    console.error('❌ Failed to retrieve account:', error.error?.error?.message || error.error);
    return null;
  }
}

async function tryCreateAccountSession() {
  try {
    console.log('🧪 Testing account session creation (this will fail if site links are not configured)...\n');
    
    // First, we need a connected account to test with
    // Let's try to create a test account session
    const postData = new URLSearchParams({
      components: JSON.stringify({
        account_onboarding: {
          enabled: true
        }
      })
    }).toString();

    const result = await makeStripeRequest('/v1/account_sessions', 'POST', postData);
    console.log('✅ Account session created successfully!');
    return true;
  } catch (error) {
    const errorMsg = error.error?.error?.message || JSON.stringify(error.error);
    if (errorMsg.includes('site-links') || errorMsg.includes('site links')) {
      console.log('❌ Site links error detected:');
      console.log('   ', errorMsg);
      console.log('');
      console.log('⚠️  This confirms that site links need to be configured.');
      return false;
    } else {
      console.log('ℹ️  Different error (may be expected):', errorMsg);
      return null;
    }
  }
}

function printConfigurationInstructions() {
  console.log('\n' + '='.repeat(70));
  console.log('📋 REQUIRED: Manual Configuration in Stripe Dashboard');
  console.log('='.repeat(70));
  console.log('');
  console.log('Stripe does not provide an API endpoint to configure site links.');
  console.log('You MUST configure them manually in the Dashboard.');
  console.log('');
  console.log('🔗 Direct Link:');
  console.log('   https://dashboard.stripe.com/settings/connect/site-links');
  console.log('');
  console.log('📝 Configuration Steps:');
  console.log('');
  console.log('For EACH of the following 5 URLs:');
  console.log('');
  const urls = [
    '1. Notification Banner',
    '2. Account Management',
    '3. Payouts',
    '4. Payments',
    '5. Balance'
  ];
  
  urls.forEach(url => {
    console.log(`   ${url}:`);
    console.log('      ☑️  Is this an embedded component?: YES');
    console.log(`      🔗 URL: ${REQUIRED_URL}`);
    console.log('');
  });
  
  console.log('💾 After configuring all 5 URLs:');
  console.log('   1. Click "Save" at the bottom');
  console.log('   2. Click "Validate" next to each URL to test');
  console.log('   3. Verify all URLs return 200 OK');
  console.log('');
  console.log('✅ Once configured, try creating an account session again.');
  console.log('');
  console.log('='.repeat(70));
}

async function main() {
  console.log('🚀 Stripe Connect Site Links Configuration Checker\n');
  
  const account = await checkAccountStatus();
  
  if (account) {
    await tryCreateAccountSession();
  }
  
  printConfigurationInstructions();
}

main().catch(console.error);

