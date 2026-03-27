/**
 * Sends booking-related emails (cancellation, rescheduling) with consistent location data.
 * Fetches session + practitioner, uses getBookingEmailLocationData, then invokes send-email.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBookingEmailLocationData } from "../_shared/booking-email-data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      emailType,
      cancellationReason,
      refundAmount,
      originalDate,
      originalTime,
      newDate,
      newTime,
      rescheduledBy,
    } = body;

    if (
      !sessionId ||
      !emailType ||
      !["cancellation", "rescheduling"].includes(emailType)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "sessionId and emailType (cancellation | rescheduling) required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("client_sessions")
      .select(
        "id, client_email, client_name, guest_view_token, therapist_id, session_date, start_time, duration_minutes, session_type, appointment_type, visit_address",
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({
          error: "Session not found",
          details: sessionError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!session.client_email) {
      return new Response(
        JSON.stringify({ error: "Session has no client email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: practitioner, error: practitionerError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, location, clinic_address")
      .eq("id", session.therapist_id)
      .single();

    if (practitionerError || !practitioner) {
      return new Response(
        JSON.stringify({
          error: "Practitioner not found",
          details: practitionerError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const locationData = getBookingEmailLocationData(
      {
        appointment_type: session.appointment_type,
        visit_address: session.visit_address,
      },
      {
        location: practitioner.location,
        clinic_address: practitioner.clinic_address,
      },
    );

    const siteUrl = Deno.env.get("SITE_URL") || "https://theramate.co.uk";
    const bookingUrl =
      session.guest_view_token && session.client_email
        ? `${siteUrl}/booking/view/${session.id}?token=${encodeURIComponent(session.guest_view_token)}`
        : undefined;

    const practitionerName =
      [practitioner.first_name, practitioner.last_name]
        .filter(Boolean)
        .join(" ") || "Practitioner";
    const sessionTime = session.start_time ?? "";

    if (emailType === "cancellation") {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          emailType: "cancellation",
          recipientEmail: session.client_email,
          recipientName: session.client_name ?? undefined,
          data: {
            sessionId: session.id,
            sessionType: session.session_type ?? undefined,
            sessionDate: session.session_date,
            sessionTime,
            practitionerName,
            cancellationReason: cancellationReason ?? "Session cancelled",
            refundAmount: refundAmount ?? 0,
            sessionLocation: locationData.sessionLocation || undefined,
            directionsUrl: locationData.directionsUrlForClient,
            bookingUrl,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: "send-email failed", details: text }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (emailType === "rescheduling") {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          emailType: "rescheduling",
          recipientEmail: session.client_email,
          recipientName: session.client_name ?? undefined,
          data: {
            sessionId: session.id,
            sessionType: session.session_type ?? undefined,
            originalDate: originalDate ?? session.session_date,
            originalTime: originalTime ?? sessionTime,
            newDate: newDate ?? session.session_date,
            newTime: newTime ?? sessionTime,
            rescheduledBy:
              typeof rescheduledBy === "string" && rescheduledBy.trim()
                ? rescheduledBy.trim()
                : practitionerName,
            sessionDuration: session.duration_minutes ?? 60,
            practitionerName,
            sessionLocation: locationData.sessionLocation || undefined,
            directionsUrl: locationData.directionsUrlForClient,
            bookingUrl,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: "send-email failed", details: text }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported emailType" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-booking-notification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
