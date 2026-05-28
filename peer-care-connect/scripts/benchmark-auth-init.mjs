/**
 * Measures Supabase auth + profile fetch latency (anonymous / no session).
 * Run: npm run test:auth:perf
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL?.trim() || 'https://aikqnvltuwwgifuocvto.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

if (!key) {
  console.error('Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ROUTING_COLUMNS =
  'id,email,first_name,last_name,user_role,onboarding_status,profile_completed,phone,therapist_type';

async function timed(label, fn, iterations = 5) {
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    const result = await fn();
    const ms = performance.now() - t0;
    samples.push(ms);
    if (result?.error) {
      console.log(`  ${label} #${i + 1}: ${ms.toFixed(0)}ms ERROR ${result.error.message}`);
    }
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length * 0.5)];
  const p95 = samples[Math.floor(samples.length * 0.95)] || samples[samples.length - 1];
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  console.log(`${label}: avg ${avg.toFixed(0)}ms | p50 ${p50.toFixed(0)}ms | p95 ${p95.toFixed(0)}ms`);
}

console.log('\n🔬 Auth init benchmark');
console.log(`   URL: ${url}\n`);

await timed('auth.getSession()', () => supabase.auth.getSession());
await timed('users select routing columns (limit 1)', () =>
  supabase.from('users').select(ROUTING_COLUMNS).limit(1)
);
await timed('users select * (limit 1)', () => supabase.from('users').select('*').limit(1));

console.log('\nDone.\n');
