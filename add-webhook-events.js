// Add missing v2 webhook events to Stripe webhook endpoint
// Run with: node add-webhook-events.js

import https from 'https';

const webhookId = 'we_1SZobHFk77knaVvaU7N5ndNj';
const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey || !apiKey.startsWith('sk_')) {
  console.error('❌ Set STRIPE_SECRET_KEY in environment');
  process.exit(1);
}

const newEvents = [
  'account.updated',
  'v2.core.account.updated',
  'v2.core.account[configuration.merchant].capability_status_updated',
  'v2.core.account[configuration.recipient].capability_status_updated',
  'account.application.deauthorized',
  'account.application.authorized',
  'checkout.session.completed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.succeeded',
  'charge.failed',
  'invoice.payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'checkout.session.expired',
  'invoice.payment_action_required'
];

// Stripe API requires form-encoded data
const postData = newEvents.map((event, index) => 
  `enabled_events[${index}]=${encodeURIComponent(event)}`
).join('&');

const options = {
  hostname: 'api.stripe.com',
  port: 443,
  path: `/v1/webhook_endpoints/${webhookId}`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Updating webhook endpoint:', webhookId);
console.log('Adding events:', newEvents.length);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Webhook updated successfully!');
      console.log('Enabled events:', response.enabled_events.length);
      console.log('Events:', response.enabled_events);
    } else {
      console.error('❌ Error updating webhook:', res.statusCode);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(postData);
req.end();

