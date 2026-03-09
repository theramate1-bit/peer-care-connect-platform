import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ Set STRIPE_SECRET_KEY in environment');
  process.exit(1);
}
const BASE_URL = 'https://theramate.co.uk/settings/payouts';

// Site links configuration
const siteLinks = {
  notification_banner_url: BASE_URL,
  account_management_url: BASE_URL,
  payouts_url: BASE_URL,
  payments_url: BASE_URL,
  balance_url: BASE_URL
};

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
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'TheraMate-SiteLinks-Config/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsed });
          } else {
            reject({ statusCode: res.statusCode, error: parsed });
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, error: body, parseError: e.message });
        }
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message });
    });

    if (data) {
      const postData = Object.entries(data)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      req.write(postData);
    }

    req.end();
  });
}

async function configureSiteLinks() {
  console.log('🔧 Attempting to configure Stripe Connect Site Links via API...\n');
  console.log('URLs to configure:', BASE_URL);
  console.log('');

  // Try multiple potential endpoints
  const endpoints = [
    { path: '/v1/account', method: 'POST' },
    { path: '/v1/account/settings', method: 'POST' },
    { path: '/v1/connect/settings', method: 'POST' },
    { path: '/v1/account/update', method: 'POST' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint.method} ${endpoint.path}...`);
      const result = await makeStripeRequest(endpoint.path, endpoint.method, siteLinks);
      console.log('✅ Success!', JSON.stringify(result.data, null, 2));
      return result;
    } catch (error) {
      if (error.statusCode) {
        console.log(`❌ ${endpoint.path} returned ${error.statusCode}:`, error.error?.error?.message || error.error?.message || JSON.stringify(error.error));
      } else {
        console.log(`❌ ${endpoint.path} error:`, error.error || error);
      }
    }
  }

  console.log('\n⚠️  API configuration not available.');
  console.log('Site links must be configured manually in the Stripe Dashboard.');
  console.log('\n📋 Manual Configuration Steps:');
  console.log('1. Go to: https://dashboard.stripe.com/settings/connect/site-links');
  console.log('2. For each of the 5 URLs, configure:');
  console.log('   - Is this an embedded component?: Yes');
  console.log(`   - URL: ${BASE_URL}`);
  console.log('3. Click "Save"');
  console.log('\n💡 Note: Stripe will automatically append ?stripe_account_id={id} to these URLs.');
}

// Run the configuration
configureSiteLinks().catch(console.error);

