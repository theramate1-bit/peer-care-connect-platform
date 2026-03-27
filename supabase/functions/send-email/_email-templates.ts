export interface EmailTemplate {
  subject: string;
  html: string;
}

const SUPPORT_EMAIL = "support@theramate.co.uk";

function getMapsUrl(data: {
  directionsUrl?: string;
  sessionLocation?: string;
}): string {
  if (data.directionsUrl && data.directionsUrl !== "#")
    return data.directionsUrl;
  if (data.sessionLocation?.trim())
    return `https://maps.apple.com/?q=${encodeURIComponent(data.sessionLocation)}`;
  return "";
}

/** Format date safely; return fallback when invalid or missing */
function safeDate(d: string | undefined | null, fallback = "\u2014"): string {
  if (!d) return fallback;
  const date = new Date(d);
  if (isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString();
}

/** Escape HTML to prevent XSS in user-generated content */
function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/** Format amount as GBP; treats integers > 100 as pence (Stripe convention) */
function formatPounds(v: number | string | undefined | null): string {
  if (v == null || v === "") return "\u2014";
  const n = Number(v);
  if (isNaN(n)) return "\u2014";
  const amount = n > 100 && Number.isInteger(n) ? n / 100 : n;
  return "\u00a3" + amount.toFixed(2);
}

function getPractitionerPaymentStatusText(raw: unknown): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return "Payment status unavailable — open Billing for live status.";
  if (["paid", "captured", "succeeded", "completed"].includes(s))
    return "Paid — client payment captured.";
  if (
    ["held", "authorized", "requires_approval", "pending_approval"].includes(s)
  )
    return "Pending practitioner approval — payment is authorized only (not captured yet).";
  if (["pending", "processing"].includes(s))
    return "Processing — payment initiated and awaiting final confirmation.";
  if (["failed", "cancelled", "canceled", "expired"].includes(s))
    return `Not paid — status: ${escapeHtml(String(raw))}.`;
  return `Payment status: ${escapeHtml(String(raw))}.`;
}

/** Preheader snippet for inbox preview (50–90 chars). Hidden from view but shown in inbox. */
function getPreheader(text: string): string {
  const safe = String(text)
    .slice(0, 130)
    .replace(/<[^>]+>/g, "");
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#fff;">${escapeHtml(safe)}</div>`;
}

/** GitHub-style CTAs (Option C) */
const CTA_PRIMARY =
  "display:inline-block;background:#0969da;color:#ffffff!important;padding:10px 16px;text-decoration:none;border-radius:6px;margin:6px 4px;font-weight:600;font-size:14px;border:1px solid #0969da;line-height:1.3";
const CTA_SECONDARY =
  "display:inline-block;background:#ffffff;color:#24292f!important;padding:10px 16px;text-decoration:none;border-radius:6px;margin:6px 4px;font-weight:600;font-size:14px;border:1px solid #d0d7de;line-height:1.3";

const BASE_STYLES = `
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.5; color: #24292f; margin: 0; padding: 0; background: #ffffff; }
  h1, h2, h3 { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #24292f; font-weight: 700; }
  p { font-size: 14px; line-height: 20px; margin: 0 0 12px 0; }
  a { color: #0969da; }
  .session-details, .details, .payment-details, .cancellation-details, .reschedule-details, .credit-details, .credit-info, .refund-info, .message-preview { background: #f6f8fa; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #d0d7de; }
  .session-details h3, .details h3, .payment-details h3 { font-size: 14px; margin: 0 0 12px 0; }
  ul { margin: 8px 0 12px 0; padding-left: 20px; }
  li { margin: 4px 0; font-size: 14px; line-height: 20px; }
`;

/**
 * Generate a Google Calendar "Add to Calendar" URL from session data.
 * Returns empty string if insufficient data to build a valid URL.
 * Format: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...
 */
function generateCalendarUrl(data: {
  sessionDate?: string;
  sessionTime?: string;
  sessionDuration?: number;
  originalDate?: string;
  originalTime?: string;
  newDate?: string;
  newTime?: string;
  sessionType?: string;
  practitionerName?: string;
  sessionLocation?: string;
}): string {
  const sessionDate = data.sessionDate || data.newDate;
  const sessionTime = data.sessionTime || data.newTime;
  const sessionDuration = data.sessionDuration;
  if (!sessionDate || !sessionTime || !sessionDuration) return "";

  // Parse sessionDate (YYYY-MM-DD) and sessionTime (HH:MM, HH:MM:SS, or similar)
  const dateMatch = String(sessionDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return "";

  const [, year, month, day] = dateMatch;
  const timeStr = String(sessionTime).trim();

  // Parse time: support HH:MM, HH:MM:SS, H:MM AM/PM
  let hours = 0;
  let minutes = 0;
  const hhmm = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (hhmm) {
    hours = parseInt(hhmm[1], 10);
    minutes = parseInt(hhmm[2], 10);
    if (hhmm[4]) {
      const isPm = hhmm[4].toLowerCase() === "pm";
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }
  } else {
    return "";
  }

  const durationMins = Number(sessionDuration) || 60;
  const startStr = `${year}${month}${day}T${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`;
  const totalStartMins = hours * 60 + minutes;
  const totalEndMins = totalStartMins + durationMins;
  const endHours = Math.floor(totalEndMins / 60) % 24;
  const endMinutes = totalEndMins % 60;
  const endDay = Math.floor(totalEndMins / 60 / 24);
  const endDate = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10) + endDay,
    endHours,
    endMinutes,
  );
  const endY = endDate.getFullYear();
  const endM = String(endDate.getMonth() + 1).padStart(2, "0");
  const endD = String(endDate.getDate()).padStart(2, "0");
  const endStr = `${endY}${endM}${endD}T${String(endHours).padStart(2, "0")}${String(endMinutes).padStart(2, "0")}00`;

  const title =
    [data.sessionType, data.practitionerName].filter(Boolean).join(" with ") ||
    "Session";
  const details = [
    data.sessionType && `Session: ${data.sessionType}`,
    data.practitionerName && `Practitioner: ${data.practitionerName}`,
    data.sessionDuration && `Duration: ${data.sessionDuration} minutes`,
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    details,
  });
  if (data.sessionLocation?.trim())
    params.set("location", data.sessionLocation.trim());
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Opens outer column + bordered card + headline (closes before template </div>) */
function getEmailHeader(_baseUrl: string, title: string): string {
  return `
  <div style="max-width:600px;margin:0 auto;padding:24px 12px 0 12px;">
  <p style="margin:0 0 16px;font-size:14px;line-height:20px;font-weight:600;color:#24292f;">TheraMate</p>
  <div style="border:1px solid #d0d7de;border-radius:6px;background:#ffffff;padding:20px;">
  <h1 style="margin:0;font-size:20px;line-height:28px;font-weight:700;color:#24292f;">${escapeHtml(title)}</h1>
  <hr style="border:none;border-top:1px solid #d0d7de;margin:16px 0;" />`;
}

/** First name for "Hi Sam" — avoids full name repetition in body */
function greetingFirst(name: string | undefined | null): string {
  if (!name?.trim()) return "there";
  return escapeHtml(name.trim().split(/\s+/)[0]!);
}

const BOX_YOUR_BOOKING = "Your booking at a glance";
const BOX_THEIR_BOOKING = "What they booked";

function getEmailFooter(baseUrl: string): string {
  return `
  <div style="padding:16px 0 8px 0;">
    <p style="margin:0;font-size:12px;line-height:18px;color:#57606a;">Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#0969da;text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a></p>
    <p style="margin:8px 0 0;font-size:12px;line-height:18px;color:#57606a;">
      <a href="${baseUrl}/help" style="color:#0969da;text-decoration:none;">Help</a> &middot;
      <a href="${baseUrl}/privacy" style="color:#0969da;text-decoration:none;">Privacy</a> &middot;
      <a href="${baseUrl}/settings/privacy" style="color:#0969da;text-decoration:none;">Unsubscribe</a>
    </p>
    <p style="margin:12px 0 0;font-size:11px;line-height:16px;color:#57606a;">TheraMate emails are for information only and are not a substitute for professional medical or mental health advice.</p>
  </div>
  </div>`;
}
export function generateEmailTemplate(
  emailType: string,
  data: any,
  recipientName: string | undefined,
  baseUrl: string,
): EmailTemplate {
  const mapsUrl = getMapsUrl(data);
  const footer = getEmailFooter(baseUrl);
  const effectiveCalendarUrl =
    data.calendarUrl && data.calendarUrl !== "#"
      ? data.calendarUrl
      : generateCalendarUrl(data);

  switch (emailType) {
    case "booking_confirmation_client": {
      const isApprovalPending =
        String(data.paymentStatus || "").toLowerCase() === "held" ||
        String(data.sessionStatus || "").toLowerCase() === "pending_approval" ||
        Boolean(data.requiresApproval);
      return {
        subject: isApprovalPending
          ? `We’ve got your request — waiting on ${data.practitionerName || "your practitioner"}`
          : `You’re booked: ${data.sessionType || "Session"} with ${data.practitionerName || "your practitioner"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Booking Confirmed</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(isApprovalPending ? "We’re holding your slot until your practitioner responds. Details inside." : `${data.sessionType || "Session"} on ${safeDate(data.sessionDate)} at ${data.sessionTime || ""} with ${data.practitionerName || "your practitioner"}.`)}
            ${getEmailHeader(baseUrl, isApprovalPending ? "Request received" : "You’re all set")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>${
                isApprovalPending
                  ? `Thanks for booking. We’ve asked <strong>${escapeHtml(String(data.practitionerName || "your practitioner"))}</strong> to confirm. Your card has a temporary hold only — you won’t be charged unless they accept.`
                  : `Your appointment with <strong>${escapeHtml(String(data.practitionerName || "your practitioner"))}</strong> is confirmed. Everything you need is below.`
              }</p>
              ${
                isApprovalPending
                  ? `
                <div style="background:#fff8c5; border:1px solid #d4a72c; padding:12px 14px; border-radius:6px; margin:16px 0;">
                  <p style="margin:0;"><strong>What happens next?</strong> You’ll get another email as soon as they accept or decline. No need to do anything right now.</p>
                </div>
              `
                  : ""
              }
              
              <div class="session-details">
                <h3>${BOX_YOUR_BOOKING}</h3>
                <p><strong>Service</strong><br>${data.sessionType || "Session"}</p>
                <p><strong>When</strong><br>${safeDate(data.sessionDate)}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Length</strong><br>${data.sessionDuration ?? "—"} minutes</p>
                <p><strong>Price</strong><br>${formatPounds(data.sessionPrice)}</p>
                ${data.sessionLocation ? `<p><strong>${data.locationKind === "mobile" ? "Where (your address)" : "Where"}</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(data.sessionLocation)}</a>` : escapeHtml(data.sessionLocation)}</p>` : ""}
                <p><strong>Practitioner</strong><br>${escapeHtml(String(data.practitionerName || "your practitioner"))}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" style="${CTA_PRIMARY}">${isApprovalPending ? "See status" : "Open my booking"}</a>
                ${effectiveCalendarUrl ? `<a href="${effectiveCalendarUrl}" style="${CTA_SECONDARY}">Add to calendar</a>` : ""}
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Directions</a>` : ""}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" style="${CTA_SECONDARY}">Message them</a>
              </div>

              <p style="font-size:13px;color:#57606a;">${
                isApprovalPending
                  ? "If they accept, we’ll charge your card and you’ll get a confirmation. If not, the hold is released automatically."
                  : "Tip: arrive a few minutes early. Need to change the time? Use your account or message your practitioner — please give at least 24 hours’ notice where you can."
              }</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };
    }

    case "booking_confirmation_practitioner":
      return {
        subject: `New client booking: ${data.clientName || "Someone"} &middot; ${data.sessionType || "Session"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>New Booking</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`${data.clientName || "A client"} booked ${data.sessionType || "a session"} for ${safeDate(data.sessionDate)} at ${data.sessionTime || ""}.`)}
            ${getEmailHeader(baseUrl, "You’ve got a new booking")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p><strong>${escapeHtml(String(data.clientName || "A client"))}</strong> has booked with you. Here’s what they chose — open your diary to confirm or follow up.</p>
              
              <div class="session-details">
                <h3>${BOX_THEIR_BOOKING}</h3>
                <p><strong>Client</strong><br>${escapeHtml(String(data.clientName || "—"))}${data.clientEmail ? ` &middot; <a href="mailto:${escapeHtml(String(data.clientEmail))}" style="color:#0969da;">${escapeHtml(String(data.clientEmail))}</a>` : ""}</p>
                <p><strong>Service</strong><br>${data.sessionType || "Session"}</p>
                <p><strong>When</strong><br>${safeDate(data.sessionDate)}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Length</strong><br>${data.sessionDuration ?? "—"} minutes</p>
                <p><strong>Price</strong><br>${formatPounds(data.sessionPrice)}</p>
                ${data.sessionLocation ? `<p><strong>${data.visitAddress ? "Visit address" : "Location"}</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(data.sessionLocation)}</a>` : escapeHtml(data.sessionLocation)}</p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/practice/schedule`)}" style="${CTA_PRIMARY}">View in diary</a>
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Directions</a>` : ""}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" style="${CTA_SECONDARY}">Message client</a>
                <a href="${baseUrl}/practice/scheduler" style="${CTA_SECONDARY}">Availability</a>
              </div>

              <p style="font-size:13px;color:#57606a;"><strong>Payment:</strong> ${getPractitionerPaymentStatusText(data.paymentStatus)}</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "payment_confirmation_client":
      return {
        subject: `Payment received — ${data.sessionType || "your session"} with ${data.practitionerName || "your practitioner"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Payment Confirmation</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`We received ${formatPounds(data.paymentAmount)} for ${data.sessionType || "your session"}. See when & where below.`)}
            ${getEmailHeader(baseUrl, "Thanks — you’re paid up")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your payment went through. Here’s a quick recap of what you booked so you have it in one place.</p>
              <div class="details">
                <h3>Receipt summary</h3>
                <p><strong>Amount paid</strong><br>${formatPounds(data.paymentAmount)}</p>
                <p><strong>Service</strong><br>${data.sessionType || "your session"}</p>
                <p><strong>When</strong><br>${safeDate(data.sessionDate, "We’ll confirm shortly")}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Length</strong><br>${data.sessionDuration != null && data.sessionDuration !== "" ? `${data.sessionDuration} minutes` : "—"}</p>
                <p><strong>With</strong><br>${escapeHtml(String(data.practitionerName || "your practitioner"))}</p>
                ${data.sessionLocation ? `<p><strong>Where</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(String(data.sessionLocation))}</a>` : escapeHtml(String(data.sessionLocation))}</p>` : ""}
                ${data.paymentId ? `<p style="font-size:12px;color:#57606a;margin-top:16px;">Reference: <code style="background:#f6f8fa;padding:2px 6px;border-radius:4px;">${escapeHtml(String(data.paymentId))}</code></p>` : ""}
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" style="${CTA_PRIMARY}">Open my booking</a>
                ${mapsUrl && data.sessionLocation ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Directions</a>` : ""}
              </div>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "payment_received_practitioner":
      return {
        subject: `You’ve been paid ${data.practitionerAmount != null && data.practitionerAmount !== "" ? formatPounds(data.practitionerAmount) : "\u00a30.00"} — ${data.clientName || "client"} · ${data.sessionType || "session"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Payment Received</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`${formatPounds(data.practitionerAmount)} from ${data.clientName || "a client"} for ${data.sessionType || "a session"}.`)}
            ${getEmailHeader(baseUrl, "Money’s on the way")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Great news — <strong>${escapeHtml(String(data.clientName || "Your client"))}</strong>’s payment for <strong>${escapeHtml(String(data.sessionType || "this session"))}</strong> is in. Here’s the split:</p>
              
              <div class="payment-details">
                <h3>What you earned</h3>
                <p><strong>Your take-home</strong><br><span style="font-size:18px;font-weight:700;">${formatPounds(data.practitionerAmount)}</span></p>
                <p><strong>Session price</strong><br>${formatPounds(data.paymentAmount)}</p>
                <p><strong>Platform fee</strong><br>${formatPounds(data.platformFee)}</p>
                <p><strong>Client</strong><br>${escapeHtml(String(data.clientName || "—"))}</p>
                <p><strong>When</strong><br>${safeDate(data.sessionDate, "—")}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Length</strong><br>${data.sessionDuration != null && data.sessionDuration !== "" ? `${data.sessionDuration} minutes` : "—"}</p>
                ${data.sessionLocation ? `<p><strong>${data.visitAddress ? "Visit address" : "Where"}</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(String(data.sessionLocation))}</a>` : escapeHtml(String(data.sessionLocation))}</p>` : ""}
                ${data.paymentId ? `<p style="font-size:12px;color:#57606a;">Reference: <code style="background:#f6f8fa;padding:2px 6px;border-radius:4px;">${escapeHtml(String(data.paymentId))}</code></p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/practice/billing`}" style="${CTA_PRIMARY}">Billing &amp; payouts</a>
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Directions</a>` : ""}
              </div>

              <p style="font-size:13px;color:#57606a;">Payouts usually land in your bank within <strong>2–7 working days</strong>. Questions? Reply to this thread or contact ${SUPPORT_EMAIL}.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "session_reminder_24h":
      return {
        subject: `Tomorrow: ${data.sessionType || "Session"} with ${data.practitionerName || "your practitioner"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Session Reminder</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Tomorrow — ${data.sessionType || "session"} at ${data.sessionTime || ""} with ${data.practitionerName || "your practitioner"}.`)}
            ${getEmailHeader(baseUrl, "See you tomorrow")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Quick reminder: you’re booked with <strong>${escapeHtml(String(data.practitionerName || "your practitioner"))}</strong> <strong>tomorrow</strong>. Save this email so the time and place are easy to find.</p>
              
              <div class="session-details">
                <h3>${BOX_YOUR_BOOKING}</h3>
                <p><strong>Service</strong><br>${data.sessionType || "Session"}</p>
                <p><strong>When</strong><br>${safeDate(data.sessionDate)}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Length</strong><br>${data.sessionDuration ?? "—"} minutes</p>
                ${data.sessionLocation ? `<p><strong>Where</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(data.sessionLocation)}</a>` : escapeHtml(data.sessionLocation)}</p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" style="${CTA_PRIMARY}">Open booking</a>
                ${effectiveCalendarUrl ? `<a href="${effectiveCalendarUrl}" style="${CTA_SECONDARY}">Add to calendar</a>` : ""}
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Directions</a>` : ""}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" style="${CTA_SECONDARY}">Message them</a>
              </div>

              <p><strong>Before you go</strong></p>
              <ul style="margin-top:4px;">
                <li>Arrive a few minutes early if you can</li>
                <li>Comfortable clothes usually work best</li>
                <li>Message your practitioner if anything’s changed</li>
              </ul>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "session_reminder_2h":
      return {
        subject: `In 2 hours: ${data.sessionType || "Session"} with ${data.practitionerName || "your practitioner"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Session Starting in 2 Hours</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Starts in 2 hours — ${data.sessionTime || ""} with ${data.practitionerName || "your practitioner"}.`)}
            ${getEmailHeader(baseUrl, "Starting in about 2 hours")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your session with <strong>${escapeHtml(String(data.practitionerName || "your practitioner"))}</strong> is coming up. If you’re heading out soon, now’s a good time to check travel time.</p>
              
              <div class="session-details">
                <h3>${BOX_YOUR_BOOKING}</h3>
                <p><strong>When</strong><br>${safeDate(data.sessionDate)}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Service</strong><br>${data.sessionType || "Session"}</p>
                ${data.sessionLocation ? `<p><strong>Where</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(data.sessionLocation)}</a>` : escapeHtml(data.sessionLocation)}</p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_PRIMARY}">Open directions</a>` : `<a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" style="${CTA_PRIMARY}">Open booking</a>`}
                ${effectiveCalendarUrl ? `<a href="${effectiveCalendarUrl}" style="${CTA_SECONDARY}">Add to calendar</a>` : ""}
                ${mapsUrl ? `<a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" style="${CTA_SECONDARY}">Open booking</a>` : ""}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" style="${CTA_SECONDARY}">Running late?</a>
              </div>

              <p style="font-size:13px;color:#57606a;">Running late or need to cancel? Message your practitioner from the app — they’ll appreciate the heads-up.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "session_reminder_1h":
      return {
        subject: `1 hour to go — ${data.sessionType || "Session"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Session Starting Soon</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`One hour until ${data.sessionType || "your session"} — ${data.sessionTime || ""}. Tap for directions.`)}
            ${getEmailHeader(baseUrl, "Almost time")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p><strong>${escapeHtml(String(data.sessionTime || "Your session"))}</strong> — you’re seeing <strong>${escapeHtml(String(data.practitionerName || "your practitioner"))}</strong> soon. Here’s where and when:</p>
              
              <div class="session-details">
                <h3>${BOX_YOUR_BOOKING}</h3>
                <p><strong>When</strong><br>${safeDate(data.sessionDate)}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Service</strong><br>${data.sessionType || "Session"}</p>
                ${data.sessionLocation ? `<p><strong>Where</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(data.sessionLocation)}</a>` : escapeHtml(data.sessionLocation)}</p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_PRIMARY}">Open directions</a>` : `<a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" style="${CTA_PRIMARY}">Open booking</a>`}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" style="${CTA_SECONDARY}">Message practitioner</a>
              </div>

              <p style="font-size:13px;color:#57606a;">Phone charged? If anything’s wrong, message them now — they’re expecting you.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "cancellation":
      return {
        subject: `Session Cancelled - ${data.sessionType || "Session"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Session Cancelled</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Your session was cancelled. ${data.refundAmount != null && Number(data.refundAmount) > 0 ? `Refund: ${formatPounds(data.refundAmount)}.` : ""} Book another session.`)}
            ${getEmailHeader(baseUrl, "Session cancelled")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>This session is <strong>no longer going ahead</strong>. We’re sorry for the inconvenience — you can rebook anytime that suits you.</p>
              
              <div class="cancellation-details">
                <h3>What was cancelled</h3>
                <p><strong>Service</strong><br>${data.sessionType || "Session"}</p>
                <p><strong>Was scheduled</strong><br>${safeDate(data.sessionDate)}${data.sessionTime ? ` &middot; ${escapeHtml(String(data.sessionTime))}` : ""}</p>
                <p><strong>Practitioner</strong><br>${escapeHtml(String(data.practitionerName || "—"))}</p>
                ${data.sessionLocation ? `<p><strong>Location:</strong> ${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(data.sessionLocation)}</a>` : escapeHtml(data.sessionLocation)}</p>` : ""}
                ${data.cancellationReason ? `<p><strong>Reason:</strong> ${escapeHtml(String(data.cancellationReason))}</p>` : ""}
                ${data.refundAmount != null && data.refundAmount !== "" ? `<p><strong>Refund Amount:</strong> ${formatPounds(data.refundAmount)}</p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                ${data.bookingUrl ? `<a href="${data.bookingUrl}" style="${CTA_PRIMARY}">View Booking</a>` : ""}
                <a href="${baseUrl}/marketplace" style="${data.bookingUrl ? CTA_SECONDARY : CTA_PRIMARY}">Book Another Session</a>
                <a href="${baseUrl}/terms#cancellation" style="${CTA_SECONDARY}">View Cancellation Policy</a>
              </div>

              ${data.refundAmount != null && data.refundAmount !== "" && Number(data.refundAmount) > 0 ? "<p><strong>Refund:</strong> Your refund will be processed within 5-10 business days.</p>" : ""}
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "rescheduling":
      return {
        subject: `Session rescheduled — new date and time`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Session Rescheduled</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Session rescheduled to ${safeDate(data.newDate)} ${data.newTime || ""}. Updated by ${data.rescheduledBy || "your practitioner"}.`)}
            ${getEmailHeader(baseUrl, "Session rescheduled")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your session has been rescheduled by <strong>${escapeHtml(String(data.rescheduledBy || "your practitioner"))}</strong>. Here are the updated details:</p>
              
              <div class="reschedule-details">
                <h3>Updated session details</h3>
                <p><strong>Session:</strong> ${data.sessionType || "Session"}</p>
                <p><strong>Original Date:</strong> ${safeDate(data.originalDate)}</p>
                <p><strong>Original Time:</strong> ${data.originalTime || "—"}</p>
                <p><strong>New Date:</strong> ${safeDate(data.newDate)}</p>
                <p><strong>New Time:</strong> ${data.newTime || "—"}</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName || "your practitioner"}</p>
                ${data.sessionLocation ? `<p><strong>Location:</strong> ${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(data.sessionLocation)}</a>` : escapeHtml(data.sessionLocation)}</p>` : ""}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" style="${CTA_PRIMARY}">Confirm new time</a>
                ${effectiveCalendarUrl ? `<a href="${effectiveCalendarUrl}" style="${CTA_SECONDARY}">Add to calendar</a>` : ""}
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Get directions</a>` : ""}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" style="${CTA_SECONDARY}">Message practitioner</a>
              </div>

              <p>Please make sure to update your calendar with the new time.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "peer_booking_confirmed_client":
      return {
        subject: `Peer treatment booking confirmed — ${data.sessionType || "Peer session"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Peer treatment booking confirmed</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Peer treatment with ${data.practitionerName || "your practitioner"} is confirmed. ${data.paymentAmount ?? 0} credits deducted.`)}
            ${getEmailHeader(baseUrl, "Peer treatment confirmed")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your peer treatment session is confirmed with <strong>${escapeHtml(String(data.practitionerName || "your practitioner"))}</strong>.</p>
              
              <div class="session-details">
                <h3>Session details</h3>
                <p><strong>Type:</strong> ${data.sessionType || "Peer session"}</p>
                <p><strong>Date:</strong> ${safeDate(data.sessionDate)}</p>
                <p><strong>Time:</strong> ${data.sessionTime || "—"}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration ?? "—"} minutes</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName || "your peer practitioner"}</p>
                ${data.sessionLocation ? `<p><strong>${data.locationKind === "mobile" ? "Visit address" : "Location"}:</strong> ${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(String(data.sessionLocation))}</a>` : escapeHtml(String(data.sessionLocation))}</p>` : ""}
              </div>

              <div class="credit-info" style="background:#fff8c5;padding:15px;border-radius:6px;margin:20px 0;border:1px solid #d4a72c;">
                <h3>Credit summary</h3>
                <p><strong>Credits Deducted:</strong> ${data.paymentAmount ?? "0"} credits</p>
                <p>These credits have been deducted from your account balance. You can view your credit balance and transaction history on your Credits page.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/credits#peer-treatment`}" style="${CTA_PRIMARY}">View booking</a>
                ${effectiveCalendarUrl ? `<a href="${effectiveCalendarUrl}" style="${CTA_SECONDARY}">Add to calendar</a>` : ""}
                ${mapsUrl && data.sessionLocation ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Get directions</a>` : ""}
              </div>

              <p style="font-size:13px;color:#57606a;">This is part of the peer treatment exchange between practitioners in the TheraMate community.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "peer_booking_confirmed_practitioner":
      return {
        subject: `New peer treatment booking — ${data.sessionType || "Session"} with ${data.clientName || "a client"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>New peer treatment booking</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`New peer booking from ${data.clientName || "a client"}. You earned ${data.paymentAmount ?? 0} credits.`)}
            ${getEmailHeader(baseUrl, "New peer treatment booking")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p><strong>${escapeHtml(String(data.clientName || "Another practitioner"))}</strong> booked a peer treatment session with you.</p>
              
              <div class="session-details">
                <h3>Session details</h3>
                <p><strong>Type:</strong> ${data.sessionType || "Peer session"}</p>
                <p><strong>Date:</strong> ${safeDate(data.sessionDate)}</p>
                <p><strong>Time:</strong> ${data.sessionTime || "—"}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration ?? "—"} minutes</p>
                <p><strong>Client (Practitioner):</strong> ${data.clientName || "the client"}</p>
                <p><strong>Client Email:</strong> ${data.clientEmail || "—"}</p>
                ${data.sessionLocation ? `<p><strong>${data.visitAddress ? "Visit address" : "Session location"}:</strong> ${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(String(data.sessionLocation))}</a>` : escapeHtml(String(data.sessionLocation))}</p>` : ""}
              </div>

              <div class="credit-info" style="background:#dafbe1;padding:15px;border-radius:6px;margin:20px 0;border:1px solid #1a7f37;">
                <h3>Credit summary</h3>
                <p><strong>Credits Earned:</strong> ${data.paymentAmount ?? "0"} credits</p>
                <p>These credits have been added to your account balance. You can use them to book your own peer treatments!</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/practice/schedule`)}" style="${CTA_PRIMARY}">View session</a>
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Get directions</a>` : ""}
                <a href="${baseUrl}/credits#peer-treatment" style="${CTA_SECONDARY}">View credits</a>
              </div>

              <p style="font-size:13px;color:#57606a;">This is part of the peer treatment exchange between practitioners in the TheraMate community.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "peer_credits_deducted":
      return {
        subject: `${data.paymentAmount || 0} credits deducted — peer treatment booking`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Credits deducted</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`${data.paymentAmount ?? 0} credits deducted for peer treatment. View balance.`)}
            ${getEmailHeader(baseUrl, "Credits deducted")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Credits have been deducted from your account for a peer treatment booking.</p>
              
              <div class="credit-details">
                <h3>Transaction details</h3>
                <p><strong>Credits Deducted:</strong> ${data.paymentAmount ?? "0"} credits</p>
                <p><strong>Session:</strong> ${data.sessionType || "Peer session"}</p>
                <p><strong>Date:</strong> ${safeDate(data.sessionDate)}</p>
                <p><strong>Time:</strong> ${data.sessionTime || "—"}</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName || "your peer practitioner"}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/credits" style="${CTA_PRIMARY}">View credit balance</a>
              </div>

              <p>You can check your credit balance and transaction history anytime on your Credits page.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "peer_credits_earned":
      return {
        subject: `+${data.paymentAmount || 0} credits earned — peer treatment`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Credits earned</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`+${data.paymentAmount ?? 0} credits earned from peer treatment. View balance and book your own.`)}
            ${getEmailHeader(baseUrl, "Credits earned")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>You earned credits from a completed peer treatment session.</p>
              
              <div class="credit-details">
                <h3>Transaction details</h3>
                <p><strong>Credits Earned:</strong> +${data.paymentAmount ?? "0"} credits</p>
                <p><strong>Session:</strong> ${data.sessionType || "Peer session"}</p>
                <p><strong>Date:</strong> ${safeDate(data.sessionDate)}</p>
                <p><strong>Time:</strong> ${data.sessionTime || "—"}</p>
                <p><strong>Client:</strong> ${data.clientName || "the client"}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/credits" style="${CTA_PRIMARY}">View credit balance</a>
                <a href="${baseUrl}/credits#peer-treatment" style="${CTA_SECONDARY}">Book peer treatment</a>
              </div>

              <p>You can use these credits to book your own peer treatment sessions with other practitioners!</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "peer_booking_cancelled_refunded":
      return {
        subject: `Peer treatment cancelled — ${data.refundAmount || 0} credits refunded`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Peer treatment cancelled</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Peer treatment cancelled. ${data.refundAmount ?? 0} credits refunded. View balance or book another.`)}
            ${getEmailHeader(baseUrl, "Peer treatment cancelled")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>A peer treatment booking has been cancelled. ${data.cancellationReason ? `Reason: ${escapeHtml(String(data.cancellationReason))}` : ""}</p>
              
              <div class="session-details">
                <h3>Cancelled session</h3>
                <p><strong>Type:</strong> ${data.sessionType || "Peer session"}</p>
                <p><strong>Date:</strong> ${safeDate(data.sessionDate)}</p>
                <p><strong>Time:</strong> ${data.sessionTime || "—"}</p>
                ${data.practitionerName ? `<p><strong>Practitioner:</strong> ${data.practitionerName}</p>` : ""}
                ${data.clientName ? `<p><strong>Client:</strong> ${data.clientName}</p>` : ""}
              </div>

              <div class="refund-info" style="background:#fff8c5;padding:15px;border-radius:6px;margin:20px 0;border:1px solid #d4a72c;">
                <h3>Credit refund</h3>
                <p><strong>Credits Refunded:</strong> ${data.refundAmount ?? "0"} credits</p>
                <p>These credits have been refunded to your account balance and are available for future peer treatment bookings.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/credits" style="${CTA_PRIMARY}">View credit balance</a>
                <a href="${baseUrl}/credits#peer-treatment" style="${CTA_SECONDARY}">Book another session</a>
              </div>

              <p>If you'd like to reschedule, you can book a new session with the same practitioner or choose a different one.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "message_notification_guest":
      return {
        subject: `New message from ${data.practitionerName || "your practitioner"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>New message</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`${data.practitionerName || "Your practitioner"} sent you a message. Log in to view and reply.`)}
            ${getEmailHeader(baseUrl, "You have a new message")}
              <p>Hi ${recipientName || "there"},</p>
              <p><strong>${data.practitionerName || "Your practitioner"}</strong> has sent you a message.</p>
              ${data.messagePreview ? `<div class="message-preview"><p>${escapeHtml(String(data.messagePreview))}</p></div>` : ""}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.viewMessageUrl || `${baseUrl}/login`}" style="${CTA_PRIMARY}">Open secure message link</a>
              </div>
              <p>Use the secure link above to open this conversation directly. If the link has expired, request a new sign-in link from the login page using the same email you used for your booking.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "booking_request_practitioner":
      return {
        subject: `New mobile booking request from ${data.clientName || "a new client"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>New Mobile Booking Request</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Mobile request from ${data.clientName || "a client"} – ${data.serviceType || "service"} on ${safeDate(data.requestedDate, "requested date")}. Review now.`)}
            ${getEmailHeader(baseUrl, "New Mobile Request")}
              <p>Hi ${recipientName || "there"},</p>
              <p>You have a new mobile session request awaiting your decision.</p>
              <div class="details">
                <h3>Request Details</h3>
                <p><strong>Client:</strong> ${data.clientName || "the client"}</p>
                <p><strong>Service:</strong> ${data.serviceType && String(data.serviceType).toLowerCase() !== "mobile service" ? escapeHtml(String(data.serviceType)) : "the requested service"}</p>
                <p><strong>Date:</strong> ${safeDate(data.requestedDate, "To be confirmed")}</p>
                <p><strong>Time:</strong> ${data.requestedTime || "To be confirmed"}</p>
                ${data.sessionDuration != null && data.sessionDuration !== "" ? `<p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>` : ""}
                ${data.sessionPrice != null && data.sessionPrice !== "" && !isNaN(Number(data.sessionPrice)) ? `<p><strong>Price:</strong> ${formatPounds(data.sessionPrice)}</p>` : ""}
                <p><strong>Address:</strong> ${data.clientAddress && String(data.clientAddress).trim() && String(data.clientAddress).toLowerCase() !== "provided in app" ? escapeHtml(String(data.clientAddress)) : "View in request for full address"}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.requestUrl || `${baseUrl}/practice/mobile-requests`}" style="${CTA_PRIMARY}">Review Request</a>
              </div>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "mobile_request_accepted_client":
      return {
        subject: `Request accepted — ${data.serviceType || "Mobile session"} on ${safeDate(data.requestedDate)}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Mobile Request Accepted</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Accepted: ${data.serviceType || "Mobile session"} on ${safeDate(data.requestedDate)}${data.requestedTime ? ` at ${String(data.requestedTime)}` : ""}. Full details inside.`)}
            ${getEmailHeader(baseUrl, "Request accepted")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p><strong>${escapeHtml(String(data.practitionerName || "Your practitioner"))}</strong> accepted your mobile booking request. Your temporary payment hold has now been captured.</p>
              <div class="session-details">
                <h3>${BOX_YOUR_BOOKING}</h3>
                <p><strong>Service</strong><br>${escapeHtml(String(data.serviceType || data.sessionType || "Mobile session"))}</p>
                <p><strong>When</strong><br>${safeDate(data.requestedDate || data.sessionDate)}${data.requestedTime || data.sessionTime ? ` &middot; ${escapeHtml(String(data.requestedTime || data.sessionTime))}` : ""}</p>
                <p><strong>Length</strong><br>${data.sessionDuration ?? "—"} minutes</p>
                ${data.clientAddress ? `<p><strong>Where (your address)</strong><br>${mapsUrl ? `<a href="${mapsUrl}" style="color:#0969da;text-decoration:none;font-weight:600">${escapeHtml(String(data.clientAddress))}</a>` : escapeHtml(String(data.clientAddress))}</p>` : ""}
                <p><strong>Practitioner</strong><br>${escapeHtml(String(data.practitionerName || "your practitioner"))}${data.practitionerEmail ? ` &middot; <a href="mailto:${escapeHtml(String(data.practitionerEmail))}" style="color:#0969da;">${escapeHtml(String(data.practitionerEmail))}</a>` : ""}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.requestUrl || `${baseUrl}/client/mobile-requests`}" style="${CTA_PRIMARY}">Open request</a>
                ${mapsUrl ? `<a href="${mapsUrl}" style="${CTA_SECONDARY}">Directions</a>` : ""}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" style="${CTA_SECONDARY}">Message practitioner</a>
              </div>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "mobile_request_declined_client":
      return {
        subject: `Request declined — ${data.serviceType || "Mobile session"} on ${safeDate(data.requestedDate)}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Mobile Request Declined</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Declined: ${data.serviceType || "Mobile session"} on ${safeDate(data.requestedDate)}. Payment hold released.`)}
            ${getEmailHeader(baseUrl, "Request declined")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your request wasn’t accepted this time. Any temporary payment hold has been released.</p>
              <div class="session-details">
                <h3>Request details</h3>
                <p><strong>Service</strong><br>${escapeHtml(String(data.serviceType || data.sessionType || "Mobile session"))}</p>
                <p><strong>Requested for</strong><br>${safeDate(data.requestedDate || data.sessionDate)}${data.requestedTime || data.sessionTime ? ` &middot; ${escapeHtml(String(data.requestedTime || data.sessionTime))}` : ""}</p>
                <p><strong>Practitioner</strong><br>${escapeHtml(String(data.practitionerName || "your practitioner"))}</p>
              </div>
              ${data.cancellationReason ? `<p><strong>Reason:</strong> ${escapeHtml(String(data.cancellationReason))}</p>` : ""}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.requestUrl || `${baseUrl}/marketplace`}" style="${CTA_PRIMARY}">Find another slot</a>
              </div>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "mobile_request_expired_client":
      return {
        subject: `Request expired — ${data.serviceType || "Mobile session"} on ${safeDate(data.requestedDate)}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Mobile Request Expired</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Expired: ${data.serviceType || "Mobile session"} on ${safeDate(data.requestedDate)}. Payment hold released.`)}
            ${getEmailHeader(baseUrl, "Request expired")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your request timed out because it wasn’t accepted in time. Any temporary payment hold has been released.</p>
              <div class="session-details">
                <h3>Request details</h3>
                <p><strong>Service</strong><br>${escapeHtml(String(data.serviceType || data.sessionType || "Mobile session"))}</p>
                <p><strong>Requested for</strong><br>${safeDate(data.requestedDate || data.sessionDate)}${data.requestedTime || data.sessionTime ? ` &middot; ${escapeHtml(String(data.requestedTime || data.sessionTime))}` : ""}</p>
                <p><strong>Practitioner</strong><br>${escapeHtml(String(data.practitionerName || "your practitioner"))}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.requestUrl || `${baseUrl}/marketplace`}" style="${CTA_PRIMARY}">Submit new request</a>
              </div>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "welcome_client":
      return {
        subject: "Welcome to TheraMate – Your account is ready!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Welcome to TheraMate</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Welcome! Your account is ready. Browse therapists and book your first session.`)}
            ${getEmailHeader(baseUrl, "Welcome to TheraMate")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your account is ready. You can now browse our marketplace of therapists and book sessions that suit you.</p>
              <div class="details">
                <h3>Before your first booking</h3>
                <p><strong>Verify your email</strong><br>If prompted in-app, complete email verification first so booking and message features are fully unlocked.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/marketplace`}" style="${CTA_PRIMARY}">Find a Therapist</a>
                ${data.verifyEmailUrl ? `<a href="${data.verifyEmailUrl}" style="${CTA_SECONDARY}">Verify email</a>` : ""}
              </div>
              <p>If you have any questions, we're here to help at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    case "welcome_practitioner":
      return {
        subject: "Welcome to TheraMate – Your practitioner account is ready!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <title>Welcome to TheraMate</title>
            <style>${BASE_STYLES}</style>
          </head>
          <body>
            ${getPreheader(`Welcome! Set up payouts before taking paid bookings so your earnings can be transferred.`)}
            ${getEmailHeader(baseUrl, "Welcome to TheraMate")}
              <p>Hi ${greetingFirst(recipientName)},</p>
              <p>Your practitioner account is ready. Before taking paid bookings, make sure your payout details are connected so completed-session earnings can be transferred to your bank account.</p>
              <div class="details">
                <h3>Production checklist</h3>
                <p><strong>1) Connect payouts (required)</strong><br>Add and verify your Stripe payout details first.</p>
                <p><strong>2) Complete profile &amp; availability</strong><br>Then publish your schedule and services.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/dashboard`}" style="${CTA_PRIMARY}">Go to Dashboard</a>
                <a href="${data.payoutsUrl || `${baseUrl}/practice/billing`}" style="${CTA_SECONDARY}">Set up payouts</a>
              </div>
              <p>If you need help getting started, email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
            </div>
            ${footer}
          </body>
          </html>
        `,
      };

    default:
      throw new Error(`Unknown email type: ${emailType}`);
  }
}
