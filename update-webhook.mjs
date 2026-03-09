// Update Stripe webhook events
import https from 'https';

const webhookId = 'we_1SZobHFk77knaVvaU7N5ndNj';
const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey || !apiKey.startsWith('sk_')) {
  console.error('❌ Set STRIPE_SECRET_KEY in environment');
  process.exit(1);
}

const events = [
  'account.updated',
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

const postData = events.map((event, index) => 
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

console.log('Updating webhook:', webhookId);
console.log('Events:', events.length);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Webhook updated successfully!');
      console.log('Events:', response.enabled_events.length);
      console.log('Event list:', response.enabled_events);
    } else {
      console.error('❌ Error:', res.statusCode);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(postData);
req.end();

