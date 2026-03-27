import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";
import { LAYOUT_TEMPLATE } from "./_layout-compiled.ts";
import { generateEmailTemplate } from "./_email-templates.ts";
import {
  enrichEmailDataFromMobileRequest,
  enrichEmailDataFromSession,
} from "../_shared/enrich-session-email-data.ts";
import { assertNoFallbackEmailData } from "../_shared/validate-email-data.ts";

// CORS headers - restrict to allowed origins in production
const getAllowedOrigin = (): string => {
  const origin = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedOrigins = origin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // In production, use specific origins; in development, allow localhost
  if (allowedOrigins.length > 0) {
    return allowedOrigins[0]; // For CORS, we need to check the request origin
  }

  // Default: allow all in development, restrict in production
  return Deno.env.get("ENVIRONMENT") === "production" ? "" : "*";
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = origin || "*";

  // In production, validate origin; in development, allow all
  const corsOrigin =
    allowedOrigin === "*" || Deno.env.get("ENVIRONMENT") !== "production"
      ? "*"
      : allowedOrigin.includes(requestOrigin)
        ? requestOrigin
        : "";

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

interface EmailRequest {
  emailType:
    | "booking_confirmation_client"
    | "booking_confirmation_practitioner"
    | "payment_confirmation_client"
    | "payment_received_practitioner"
    | "session_reminder_24h"
    | "session_reminder_2h"
    | "session_reminder_1h"
    | "cancellation"
    | "rescheduling"
    | "booking_request_practitioner"
    | "mobile_request_accepted_client"
    | "mobile_request_declined_client"
    | "mobile_request_expired_client"
    | "peer_booking_confirmed_client"
    | "peer_booking_confirmed_practitioner"
    | "peer_credits_deducted"
    | "peer_credits_earned"
    | "peer_booking_cancelled_refunded"
    | "message_notification_guest"
    | "welcome_client"
    | "welcome_practitioner";
  recipientEmail: string;
  recipientName?: string;
  data: {
    requestId?: string;
    // Session data
    sessionId?: string;
    sessionType?: string;
    sessionDate?: string;
    sessionTime?: string;
    sessionPrice?: number;
    sessionDuration?: number;
    sessionLocation?: string;
    visitAddress?: string;
    locationKind?: "clinic" | "mobile";

    // User data
    clientName?: string;
    clientEmail?: string;
    practitionerName?: string;
    practitionerEmail?: string;

    // Payment data
    paymentAmount?: number;
    platformFee?: number;
    practitionerAmount?: number;
    paymentId?: string;

    // Additional data
    cancellationReason?: string;
    refundAmount?: number;
    originalDate?: string;
    originalTime?: string;
    newDate?: string;
    newTime?: string;
    rescheduledBy?: string;
    bookingUrl?: string;
    calendarUrl?: string;
    messageUrl?: string;
    directionsUrl?: string;
    paymentStatus?: string;
    sessionStatus?: string;
    requiresApproval?: boolean;
    practitionerName?: string;
    messagePreview?: string;
    viewMessageUrl?: string;
    // Mobile request data
    requestedDate?: string;
    requestedTime?: string;
    requestUrl?: string;
    clientAddress?: string;
    serviceType?: string;
    verifyEmailUrl?: string;
    payoutsUrl?: string;
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Validate Content-Type
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Parse and validate request body
    let emailRequest: EmailRequest;
    try {
      const bodyText = await req.text();
      if (bodyText.length > 10 * 1024 * 1024) {
        // 10MB limit
        return new Response(
          JSON.stringify({ error: "Request body is too large (max 10MB)" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin),
              "Content-Type": "application/json",
            },
          },
        );
      }
      emailRequest = JSON.parse(bodyText) as EmailRequest;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const {
      emailType,
      recipientEmail,
      recipientName,
      data: rawData,
    } = emailRequest;

    // Validate required fields
    if (!emailType || typeof emailType !== "string") {
      return new Response(
        JSON.stringify({ error: "emailType is required and must be a string" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!recipientEmail || typeof recipientEmail !== "string") {
      return new Response(
        JSON.stringify({
          error: "recipientEmail is required and must be a string",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY secret is missing");
      throw new Error(
        "RESEND_API_KEY not configured. Please add it to Edge Function secrets in Supabase Dashboard.",
      );
    }

    // Log that API key exists (but don't log the actual key)
    console.log(
      "Resend API key configured:",
      resendApiKey.substring(0, 10) + "...",
    );

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({
          error: `Invalid email address format: ${recipientEmail}`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate email length (RFC 5321 limit is 254 characters)
    if (recipientEmail.length > 254) {
      return new Response(
        JSON.stringify({
          error: "Email address is too long (max 254 characters)",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate emailType is one of allowed values
    const validEmailTypes = [
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
    ];

    if (!validEmailTypes.includes(emailType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid emailType. Must be one of: ${validEmailTypes.join(", ")}`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate recipientName if provided
    if (
      recipientName &&
      (typeof recipientName !== "string" || recipientName.length > 200)
    ) {
      return new Response(
        JSON.stringify({
          error: "recipientName must be a string with max 200 characters",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Merge real session / mobile-request data from DB when ids are present (source of truth)
    let emailData: Record<string, unknown> = { ...(rawData || {}) };
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supUrl = Deno.env.get("SUPABASE_URL");
    if (serviceKey && supUrl) {
      const admin = createClient(supUrl, serviceKey);
      emailData = await enrichEmailDataFromSession(
        admin,
        emailType,
        emailData,
        Deno.env.get("SITE_URL") || "https://theramate.co.uk",
      );
      emailData = await enrichEmailDataFromMobileRequest(
        admin,
        emailType,
        emailData,
      );
    }

    // Enforce: production emails must not render with placeholder/missing values
    // (prevents users seeing "—", "to be confirmed", "your practitioner", etc.)
    try {
      assertNoFallbackEmailData(emailType, { ...emailData, recipientName });
    } catch (e) {
      const details = e instanceof Error ? e.message : String(e);
      console.error("Email validation failed:", {
        emailType,
        recipientEmail,
        details,
      });
      return new Response(
        JSON.stringify({ error: "Missing required email data", details }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Generate email template
    let template = generateEmailTemplate(
      emailType,
      emailData,
      recipientName,
      Deno.env.get("SITE_URL") || "https://theramate.co.uk",
    );

    // Wrap with MJML table-based layout (improves Outlook/older clients)
    // Preserve template <style> blocks (our templates rely on BASE_STYLES).
    const styleBlocks = Array.from(
      template.html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi),
    )
      .map((m) => m[0])
      .join("\n");

    const bodyMatch = template.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyInner = bodyMatch ? bodyMatch[1].trim() : template.html;
    // IMPORTANT: The MJML-compiled layout expects table rows inside <tbody>.
    // Our templates output div-based content, so we must wrap it in <tr><td> to avoid
    // clients dropping content due to invalid table structure.
    const wrappedBody = `<tr><td style="padding:0;margin:0;">${bodyInner}</td></tr>`;
    const withStyles = styleBlocks
      ? LAYOUT_TEMPLATE.replace("</head>", `${styleBlocks}\n</head>`)
      : LAYOUT_TEMPLATE;
    template = {
      ...template,
      html: withStyles.replace("{{FULL_BODY}}", wrappedBody),
    };

    // Determine sender email - use onboarding@resend.dev for testing, can upgrade to verified domain later
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "Theramate <onboarding@resend.dev>";

    const resendPayload = {
      from: fromEmail,
      to: [recipientEmail],
      subject: template.subject,
      html: template.html,
    };

    // Send email via Resend API with retry on 429 (rate limit)
    const MAX_RETRIES = 3;
    let lastResponse: Response | null = null;
    let lastResendData: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resendPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastResponse = resendResponse;

        const responseText = await resendResponse.text();
        lastResendData = responseText ? JSON.parse(responseText) : {};

        if (resendResponse.ok) break;

        if (resendResponse.status === 429 && attempt < MAX_RETRIES) {
          const retryAfter = parseInt(
            resendResponse.headers.get("Retry-After") || "1",
            10,
          );
          const waitMs = Math.min(retryAfter * 1000, 5000); // cap at 5s
          console.log(
            `Resend 429, retrying in ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})`,
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        break;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Resend API request timed out after 30 seconds");
        }
        throw fetchError;
      }
    }

    const resendResponse = lastResponse!;
    const resendData = lastResendData || {};

    if (!resendResponse.ok) {
      const errorMessage =
        resendData.message || resendData.error || JSON.stringify(resendData);

      // Handle rate limiting (429) with retry information
      if (resendResponse.status === 429) {
        const retryAfter = resendResponse.headers.get("Retry-After");
        console.error("Resend API rate limit exceeded:", {
          retryAfter: retryAfter || "unknown",
          recipientEmail: recipientEmail,
          emailType: emailType,
        });
      } else {
        console.error("Resend API error:", {
          status: resendResponse.status,
          statusText: resendResponse.statusText,
          response: resendData,
          recipientEmail: recipientEmail,
          emailType: emailType,
        });
      }

      // Log failed attempt to database
      try {
        await supabaseClient.from("email_logs").insert({
          email_type: emailType,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: template.subject,
          resend_email_id: null,
          status: "failed",
          error_message: errorMessage,
          sent_at: null,
          metadata: {
            resend_response: resendData,
            resend_status: resendResponse.status,
            retry_after: resendResponse.headers.get("Retry-After"),
            template_data: emailData,
            recipient_name: recipientName,
          },
        });
      } catch (logErr) {
        console.error("Failed to log email error:", logErr);
      }

      throw new Error(
        `Resend API error (${resendResponse.status}): ${errorMessage}`,
      );
    }

    // Extract email ID from response
    const emailId = resendData.id || null;

    if (!emailId) {
      console.warn("Resend API returned success but no email ID:", resendData);
    }

    // Log successful email send to database
    try {
      const { error: logError } = await supabaseClient
        .from("email_logs")
        .insert({
          email_type: emailType,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: template.subject,
          resend_email_id: emailId,
          status: emailId ? "sent" : "pending",
          sent_at: new Date().toISOString(),
          metadata: {
            resend_response: resendData,
            template_data: emailData,
            recipient_name: recipientName,
          },
        });

      if (logError) {
        console.error("Failed to log email:", logError);
        // Don't fail the request if logging fails
      }
    } catch (logErr) {
      console.error("Email logging error (table may not exist):", logErr);
      // Continue even if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailId,
        message: "Email sent successfully",
        resend_response: resendData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Email send error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  }
});
