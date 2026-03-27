/**
 * Node/tsx version of preview HTML emitter.
 * Writes full HTML to .email-dumps/{1..21}.html + manifest.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateEmailTemplate } from "../supabase/functions/send-email/_email-templates.ts";
import { LAYOUT_TEMPLATE } from "../supabase/functions/send-email/_layout-compiled.ts";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const finalDir = path.join(repoRoot, ".email-dumps");

async function main() {
  await fs.mkdir(finalDir, { recursive: true });
  const manifest: { n: number; type: string; subject: string; file: string }[] =
    [];

  for (let i = 0; i < EMAIL_TYPES.length; i++) {
    const emailType = EMAIL_TYPES[i];
    const data: Record<string, unknown> = { ...baseData };
    if (emailType === "booking_confirmation_client") {
      data.calendarUrl =
        "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Preview";
    }

    const { subject, html } = generateEmailTemplate(
      emailType,
      data,
      "Preview",
      "https://theramate.co.uk",
    );
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
    const full = withStyles.replace("{{FULL_BODY}}", wrappedBody);
    const n = i + 1;
    const file = path.join(finalDir, `${n}.html`);
    await fs.writeFile(file, full, "utf8");
    manifest.push({
      n,
      type: emailType,
      subject: `[Full HTML ${n}/21] ${subject}`,
      file,
    });
  }

  await fs.writeFile(
    path.join(finalDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  console.log(
    JSON.stringify({ ok: true, dir: finalDir, count: manifest.length }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
