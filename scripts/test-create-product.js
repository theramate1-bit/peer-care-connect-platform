/**
 * Test Create Product flow: sign in, invoke stripe-payment create-product, log full response.
 * Run: node scripts/test-create-product.js
 * Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Set TEST_EMAIL and TEST_PASSWORD. Example: TEST_EMAIL=you@example.com TEST_PASSWORD=*** node scripts/test-create-product.js');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  console.log('Signing in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr || !authData?.session) {
    console.error('Sign-in failed:', authErr?.message || authErr);
    process.exit(1);
  }
  const uid = authData.user?.id;
  console.log('Signed in:', uid);

  const body = {
    action: 'create-product',
    practitioner_id: uid,
    name: '60 Min sports massage',
    description: '',
    price_amount: 100,
    duration_minutes: 60,
    category: 'general',
    service_category: null,
  };

  console.log('Invoking stripe-payment create-product...');
  const { data, error } = await supabase.functions.invoke('stripe-payment', {
    body,
    headers: { Authorization: `Bearer ${authData.session.access_token}` },
  });

  console.log('\n--- Response ---');
  console.log('error:', error ? { message: error.message, name: error?.name } : null);
  console.log('data:', JSON.stringify(data, null, 2));

  let bodyFromContext = null;
  if (error?.context && typeof error.context?.json === 'function') {
    try { bodyFromContext = await error.context.json(); } catch (_) {}
    if (bodyFromContext) console.log('error.context body:', JSON.stringify(bodyFromContext, null, 2));
  }

  const detail = bodyFromContext?.details ?? data?.details;
  const errMsg = bodyFromContext?.error ?? data?.error;
  if (errMsg) console.log('\nToast would show:', [errMsg, detail].filter(Boolean).join(' — '));
}

main().catch((e) => { console.error(e); process.exit(1); });
