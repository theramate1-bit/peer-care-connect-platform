/**
 * QA smoke: email system + guest/location logic.
 * Calls send-email (clinic + mobile payloads), send-booking-notification (cancellation), get_session_by_guest_token.
 * Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env or .env (ignored by git).
 * Run: node test-scripts/qa-email-guest-location-smoke.js
 */

const fs = require("fs");
const path = require("path");
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(name, ok, detail = "") {
  const icon = ok ? "✔" : "✗";
  console.log(`${icon} ${name}${detail ? ` – ${detail}` : ""}`);
}

async function invoke(name, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function rpc(name, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log("QA smoke: email + guest + location\n");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  // 1. send-email with clinic payload (client)
  const clinicPayload = {
    emailType: "booking_confirmation_client",
    recipientEmail: "delivered@resend.dev",
    recipientName: "Smoke Client",
    data: {
      sessionId: "smoke-session-1",
      sessionType: "Clinic Session",
      sessionDate: new Date().toISOString().split("T")[0],
      sessionTime: "14:00",
      sessionDuration: 60,
      sessionPrice: 50,
      sessionLocation: "123 Clinic St",
      directionsUrl:
        "https://www.google.com/maps/dir/?api=1&destination=123+Clinic+St",
      practitionerName: "Clinic Practitioner",
      bookingUrl: "https://example.com/booking/view/smoke-1",
    },
  };
  const clinicRes = await invoke("send-email", clinicPayload);
  const clinicOk = clinicRes.ok && clinicRes.status === 200;
  if (clinicOk) passed++;
  else failed++;
  log(
    "send-email (clinic client)",
    clinicOk,
    clinicOk ? "" : `status ${clinicRes.status}`,
  );

  // 2. send-email with mobile payload (client: no directions)
  const mobileClientPayload = {
    emailType: "booking_confirmation_client",
    recipientEmail: "delivered@resend.dev",
    recipientName: "Smoke Client",
    data: {
      sessionId: "smoke-session-2",
      sessionType: "Mobile Session",
      sessionDate: new Date().toISOString().split("T")[0],
      sessionTime: "15:00",
      sessionDuration: 60,
      sessionPrice: 60,
      sessionLocation: "Client Home, 456 Client Ave",
      directionsUrl: undefined,
      locationKind: "mobile",
      practitionerName: "Mobile Practitioner",
      bookingUrl: "https://example.com/booking/view/smoke-2",
    },
  };
  const mobileClientRes = await invoke("send-email", mobileClientPayload);
  const mobileClientOk = mobileClientRes.ok && mobileClientRes.status === 200;
  if (mobileClientOk) passed++;
  else failed++;
  log(
    "send-email (mobile client)",
    mobileClientOk,
    mobileClientOk ? "" : `status ${mobileClientRes.status}`,
  );

  // 3. send-booking-notification cancellation (requires real sessionId; skip or expect 404/400 if none)
  const cancelBody = {
    sessionId: "00000000-0000-0000-0000-000000000001",
    emailType: "cancellation",
    cancellationReason: "Smoke test",
    refundAmount: 0,
  };
  const cancelRes = await invoke("send-booking-notification", cancelBody);
  const cancelOk =
    cancelRes.ok || cancelRes.status === 404 || cancelRes.status === 400;
  if (cancelOk) passed++;
  else failed++;
  log(
    "send-booking-notification (cancellation)",
    cancelOk,
    cancelRes.ok
      ? "sent"
      : `status ${cancelRes.status} (expected if no test session)`,
  );

  // 4. get_session_by_guest_token (expect null/invalid if no real session+token)
  const tokenRes = await rpc("get_session_by_guest_token", {
    p_session_id: "00000000-0000-0000-0000-000000000001",
    p_token: "invalid-token-smoke",
  });
  const tokenOk =
    tokenRes.ok &&
    (tokenRes.data === null ||
      (typeof tokenRes.data === "object" && !tokenRes.data.id));
  if (tokenOk) passed++;
  else failed++;
  log(
    "get_session_by_guest_token (invalid)",
    tokenOk,
    tokenOk ? "returns null/no session" : `status ${tokenRes.status}`,
  );

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
