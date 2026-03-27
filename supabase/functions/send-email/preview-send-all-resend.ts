/**
 * Send all 21 transactional templates as full HTML (same as production) via Resend.
 * No Supabase required — only RESEND_API_KEY (+ optional RESEND_FROM_EMAIL, SITE_URL).
 *
 * Usage (from repo root or this folder):
 *   cd supabase/functions/send-email
 *   deno run -A --env-file=../../../../.env preview-send-all-resend.ts theramate1@gmail.com
 *
 * Or pass env inline:
 *   RESEND_API_KEY=re_xxx deno run -A preview-send-all-resend.ts theramate1@gmail.com
 */
import { generateEmailTemplate } from "./_email-templates.ts";
import { LAYOUT_TEMPLATE } from "./_layout-compiled.ts";

const EMAIL_TYPES = [
  "booking_confirmation_client",
  "booking_confirmation_practitioner",
  "payment_confirmation_client",
  "payment_received_practitioner",
  "session_reminder_24h",
  "session_reminder_2h",
  "session_reminder_1h",
  "cancellation",
  "rescheduling",
  "booking_request_practitioner",
  "mobile_request_accepted_client",
  "mobile_request_declined_client",
  "mobile_request_expired_client",
  "peer_booking_confirmed_client",
  "peer_booking_confirmed_practitioner",
  "peer_credits_deducted",
  "peer_credits_earned",
  "peer_booking_cancelled_refunded",
  "message_notification_guest",
  "welcome_client",
  "welcome_practitioner",
] as const;

const baseData: Record<string, unknown> = {
  sessionId: "preview-session-001",
  sessionType: "Deep Tissue Massage",
  sessionDate: "2026-03-22",
  sessionTime: "14:00",
  sessionPrice: 65,
  sessionDuration: 60,
  sessionLocation: "12 Wellness Street, London EC1A 1BB",
  locationKind: "clinic",
  clientName: "Alex Client",
  clientEmail: "alex.client@example.com",
  practitionerName: "Dr Jane Smith",
  practitionerEmail: "jane.smith@example.com",
  paymentAmount: 6500,
  platformFee: 33,
  practitionerAmount: 6467,
  paymentId: "pi_preview_001",
  bookingUrl: "https://theramate.co.uk/client/sessions",
  messageUrl: "https://theramate.co.uk/messages",
  directionsUrl: "https://maps.apple.com/?q=London",
  cancellationReason: "Schedule conflict (preview)",
  refundAmount: 65,
  originalDate: "2026-03-20",
  originalTime: "10:00",
  newDate: "2026-03-22",
  newTime: "14:00",
  requestedDate: "2026-03-25",
  requestedTime: "11:30",
  requestUrl: "https://theramate.co.uk/practice/mobile-requests",
  clientAddress: "45 Client Road, London N1 1AA",
  serviceType: "Sports massage (mobile)",
  messagePreview:
    "Hi Alex - looking forward to our session. Please confirm you can make Tuesday at 2pm.",
  viewMessageUrl: "https://theramate.co.uk/messages",
};

function wrapLayout(html: string): string {
  const styleBlocks = Array.from(
    html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi),
  )
    .map((m) => m[0])
    .join("\n");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1].trim() : html;
  const wrappedBody = `<tr><td style="padding:0;margin:0;">${bodyInner}</td></tr>`;
  const withStyles = styleBlocks
    ? LAYOUT_TEMPLATE.replace("</head>", `${styleBlocks}\n</head>`)
    : LAYOUT_TEMPLATE;
  return withStyles.replace("{{FULL_BODY}}", wrappedBody);
}

const recipient = Deno.args[0];
if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  console.error(
    "Usage: deno run -A preview-send-all-resend.ts <email@example.com>",
  );
  Deno.exit(1);
}

const apiKey = Deno.env.get("RESEND_API_KEY");
if (!apiKey) {
  console.error("Missing RESEND_API_KEY");
  Deno.exit(1);
}

const from =
  Deno.env.get("RESEND_FROM_EMAIL") || "Theramate <onboarding@resend.dev>";
const siteUrl = Deno.env.get("SITE_URL") || "https://theramate.co.uk";
const delayMs = Number(Deno.env.get("SEND_TEST_EMAIL_DELAY_MS")) || 700;

console.log(`Sending ${EMAIL_TYPES.length} full HTML emails to ${recipient}\n`);

for (let i = 0; i < EMAIL_TYPES.length; i++) {
  const emailType = EMAIL_TYPES[i];
  const data = { ...baseData };
  if (emailType === "booking_confirmation_client") {
    (data as { calendarUrl: string }).calendarUrl =
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Preview";
  }
  let { subject, html } = generateEmailTemplate(
    emailType,
    data,
    "Preview",
    siteUrl,
  );
  html = wrapLayout(html);
  subject = `[Full HTML ${i + 1}/${EMAIL_TYPES.length}] ${subject}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [recipient], subject, html }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`FAIL ${emailType}`, res.status, j);
    } else {
      console.log(`OK   ${emailType} id=${j.id ?? "-"}`);
    }
  } catch (e) {
    console.error(`FAIL ${emailType}`, e);
  }
  if (i < EMAIL_TYPES.length - 1)
    await new Promise((r) => setTimeout(r, delayMs));
}

console.log("\nDone.");
