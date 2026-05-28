/**
 * Read-only smoke checks for treatment exchange RPC definitions (production).
 * Run: node scripts/verify-treatment-exchange-rpcs.mjs
 */
const PROJECT = "aikqnvltuwwgifuocvto";
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN required");
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

const checks = [
  {
    name: "mutual_exchange_sessions leg columns",
    query: `SELECT COUNT(*)::int AS n FROM information_schema.columns
      WHERE table_schema='public' AND table_name='mutual_exchange_sessions'
      AND column_name IN ('practitioner_a_session_id','practitioner_b_session_id','practitioner_a_booked')`,
    expect: (rows) => rows[0]?.n === 3,
  },
  {
    name: "accept_exchange_request creates leg-1 session",
    query: `SELECT (pg_get_functiondef(p.oid) LIKE '%practitioner_a_session_id%') AS ok
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='accept_exchange_request'`,
    expect: (rows) => rows[0]?.ok === true,
  },
  {
    name: "book_exchange_reciprocal_session LEG_A guard",
    query: `SELECT (pg_get_functiondef(p.oid) LIKE '%LEG_A_SESSION_MISSING%') AS ok
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='book_exchange_reciprocal_session'`,
    expect: (rows) => rows[0]?.ok === true,
  },
  {
    name: "process_peer_booking_credits idempotent (uuid overload)",
    query: `SELECT (pg_get_functiondef(p.oid) LIKE '%credit_transactions%') AS ok
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='process_peer_booking_credits'
      AND pg_get_function_identity_arguments(p.oid) = 'p_session_id uuid'`,
    expect: (rows) => rows[0]?.ok === true,
  },
  {
    name: "decline_exchange_request auth check",
    query: `SELECT (pg_get_functiondef(p.oid) LIKE '%auth.uid()%') AS ok
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='decline_exchange_request'`,
    expect: (rows) => rows[0]?.ok === true,
  },
  {
    name: "migrations recorded",
    query: `SELECT COUNT(*)::int AS n FROM supabase_migrations.schema_migrations
      WHERE name IN ('treatment_exchange_leg1_credits_slot_hold','treatment_exchange_review_fixes','treatment_exchange_conflicts_copy_cancel')`,
    expect: (rows) => rows[0]?.n >= 2,
  },
  {
    name: "assert_practitioner_slot_available exists",
    query: `SELECT COUNT(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='assert_practitioner_slot_available'`,
    expect: (rows) => rows[0]?.n === 1,
  },
  {
    name: "create request no 24h copy",
    query: `SELECT (pg_get_functiondef(p.oid) NOT LIKE '%24 hours%') AS ok
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='create_treatment_exchange_request'`,
    expect: (rows) => rows[0]?.ok === true,
  },
  {
    name: "accept uses slot assert",
    query: `SELECT (pg_get_functiondef(p.oid) LIKE '%assert_practitioner_slot_available%') AS ok
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='accept_exchange_request'`,
    expect: (rows) => rows[0]?.ok === true,
  },
  {
    name: "peer refund no-payment path",
    query: `SELECT (pg_get_functiondef(p.oid) LIKE '%credits_were_deducted%') AS ok
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='process_peer_booking_refund'`,
    expect: (rows) => rows[0]?.ok === true,
  },
];

let failed = 0;
for (const c of checks) {
  try {
    const rows = await sql(c.query);
    const pass = c.expect(rows);
    console.log(pass ? "PASS" : "FAIL", c.name);
    if (!pass) {
      failed++;
      console.log("  ", JSON.stringify(rows));
    }
  } catch (e) {
    failed++;
    console.log("FAIL", c.name, e.message);
  }
}
process.exit(failed ? 1 : 0);
