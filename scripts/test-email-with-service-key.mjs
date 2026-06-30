#!/usr/bin/env node
/**
 * Invoke send-email edge function using SUPABASE_SERVICE_ROLE_KEY from env only.
 *   node scripts/test-email-with-service-key.mjs
 * Requires: SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY in .env or env.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in environment.",
  );
  console.error("Copy from .env.example — never commit service role keys.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testEmailFunction() {
  console.log("Testing send-email via service role (env only)…\n");

  const testPayload = {
    emailType: "booking_confirmation_client",
    recipientEmail: "delivered@resend.dev",
    recipientName: "Test User",
    data: {
      sessionId: `test-diagnostic-${Date.now()}`,
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionPrice: 50,
      sessionDuration: 60,
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      calendarUrl: "#",
      messageUrl: "https://theramate.co.uk/messages",
    },
  };

  const { data, error } = await supabase.functions.invoke("send-email", {
    body: testPayload,
  });

  if (error) {
    console.error("Function error:", error.message);
    process.exit(1);
  }

  if (data?.success) {
    console.log("OK — emailId:", data.emailId);
    process.exit(0);
  }

  console.error("Function returned failure:", data);
  process.exit(1);
}

testEmailFunction().catch((err) => {
  console.error(err);
  process.exit(1);
});
