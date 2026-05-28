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
      requestId: bodyRequestId,
      cancellationReason,
      refundAmount,
      originalDate,
      originalTime,
      newDate,
      newTime,
      rescheduledBy,
    } = body;

    if (!emailType) {
      return new Response(JSON.stringify({ error: "emailType is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://theramate.co.uk";

    const invokeSendEmail = async (payload: {
      emailType: string;
      recipientEmail: string;
      recipientName?: string;
      data: Record<string, unknown>;
    }) => {
      const r = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const text = await r.text();
        console.warn(
          "send-booking-notification: send-email failed",
          payload.emailType,
          r.status,
          text,
        );
        return { ok: false as const, details: text };
      }
      return { ok: true as const };
    };

    if (emailType === "mobile_decline" || emailType === "mobile_expired") {
      const requestId =
        typeof bodyRequestId === "string" && bodyRequestId.trim()
          ? bodyRequestId.trim()
          : "";
      if (!requestId) {
        return new Response(
          JSON.stringify({
            error: "requestId is required for mobile_decline/expired",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: mbr, error: mbrErr } = await supabase
        .from("mobile_booking_requests")
        .select(
          "id, client_id, practitioner_id, requested_date, requested_start_time, product_id, decline_reason, status",
        )
        .eq("id", requestId)
        .maybeSingle();

      if (mbrErr || !mbr) {
        return new Response(
          JSON.stringify({
            error: "mobile_booking_request not found",
            details: mbrErr?.message,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: clientUser } = await supabase
        .from("users")
        .select("email, first_name, last_name, user_role")
        .eq("id", mbr.client_id)
        .maybeSingle();

      const clientEmail = clientUser?.email?.trim() || "";
      if (!clientEmail) {
        return new Response(
          JSON.stringify({ error: "Client email not found for request" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: practitioner } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", mbr.practitioner_id)
        .maybeSingle();

      const { data: product } = await supabase
        .from("practitioner_products")
        .select("name")
        .eq("id", mbr.product_id)
        .maybeSingle();

      const practitionerName =
        [practitioner?.first_name, practitioner?.last_name]
          .filter(Boolean)
          .join(" ") || "Your practitioner";
      const clientName =
        [clientUser?.first_name, clientUser?.last_name]
          .filter(Boolean)
          .join(" ") || "Client";
      const requestUrl =
        clientUser?.user_role === "guest"
          ? `${siteUrl}/guest/mobile-requests?email=${encodeURIComponent(clientEmail)}&requestId=${encodeURIComponent(requestId)}`
          : `${siteUrl}/client/mobile-requests?requestId=${encodeURIComponent(requestId)}`;

      const templateType =
        emailType === "mobile_decline"
          ? "mobile_request_declined_client"
          : "mobile_request_expired_client";

      const result = await invokeSendEmail({
        emailType: templateType,
        recipientEmail: clientEmail,
        recipientName: clientName,
        data: {
          requestId,
          serviceType: product?.name || "Mobile session",
          requestedDate: mbr.requested_date,
          requestedTime: mbr.requested_start_time,
          practitionerName,
          cancellationReason: mbr.decline_reason || undefined,
          requestUrl,
        },
      });

      if (!result.ok) {
        return new Response(
          JSON.stringify({
            error: "send-email failed",
            details: "details" in result ? result.details : "",
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ ok: true, sent: 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          error: "sessionId is required for this emailType",
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
        "id, client_id, client_email, client_name, guest_view_token, therapist_id, session_date, start_time, duration_minutes, session_type, appointment_type, visit_address, payment_collection, payment_status, price, platform_fee_amount, practitioner_amount, requires_approval, status",
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

    if (emailType === "mobile_accept") {
      let clientEmail = session.client_email?.trim() || "";
      if (!clientEmail && session.client_id) {
        const { data: clientUser } = await supabase
          .from("users")
          .select("email")
          .eq("id", session.client_id)
          .maybeSingle();
        clientEmail = clientUser?.email?.trim() || "";
      }
      if (!clientEmail) {
        return new Response(
          JSON.stringify({ error: "Session has no client email" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!session.therapist_id) {
        return new Response(
          JSON.stringify({ error: "Session has no therapist_id" }),
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

      if (practitionerError || !practitioner?.email) {
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

      let requestId =
        typeof bodyRequestId === "string" && bodyRequestId.trim()
          ? bodyRequestId.trim()
          : "";
      if (!requestId) {
        const { data: mbr } = await supabase
          .from("mobile_booking_requests")
          .select("id")
          .eq("session_id", sessionId)
          .maybeSingle();
        requestId = mbr?.id || "";
      }
      if (!requestId) {
        return new Response(
          JSON.stringify({
            error: "mobile_booking_request not found for session",
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

      const bookingUrl =
        session.guest_view_token && clientEmail
          ? `${siteUrl}/booking/view/${session.id}?token=${encodeURIComponent(session.guest_view_token)}`
          : `${siteUrl}/client/mobile-requests`;

      const practitionerName =
        [practitioner.first_name, practitioner.last_name]
          .filter(Boolean)
          .join(" ") || "Practitioner";
      const sessionTime = session.start_time ?? "";

      let clientRole: string | null = null;
      if (session.client_id) {
        const { data: clientUser } = await supabase
          .from("users")
          .select("user_role, email")
          .eq("id", session.client_id)
          .maybeSingle();
        clientRole = clientUser?.user_role ?? null;
      }
      const requestUrl =
        clientRole === "guest" && clientEmail
          ? `${siteUrl}/guest/mobile-requests?email=${encodeURIComponent(clientEmail)}&requestId=${encodeURIComponent(requestId)}`
          : `${siteUrl}/client/mobile-requests`;

      const results = await Promise.all([
        invokeSendEmail({
          emailType: "mobile_request_accepted_client",
          recipientEmail: clientEmail,
          recipientName: session.client_name ?? undefined,
          data: {
            requestId,
            sessionId: session.id,
            serviceType: session.session_type ?? "Mobile session",
            sessionDate: session.session_date,
            sessionTime,
            sessionDuration: session.duration_minutes ?? 60,
            practitionerName,
            practitionerEmail: practitioner.email,
            clientAddress:
              locationData.visitAddress ||
              session.visit_address ||
              locationData.sessionLocation,
            sessionLocation: locationData.sessionLocation,
            directionsUrl: locationData.directionsUrlForPractitioner,
            requestUrl,
            bookingUrl,
          },
        }),
        invokeSendEmail({
          emailType: "booking_confirmation_practitioner",
          recipientEmail: practitioner.email,
          recipientName: practitionerName,
          data: {
            sessionId: session.id,
            sessionType: session.session_type ?? undefined,
            sessionDate: session.session_date,
            sessionTime,
            sessionDuration: session.duration_minutes ?? 60,
            clientName: session.client_name,
            clientEmail,
            practitionerName,
            sessionLocation: locationData.sessionLocation || undefined,
            directionsUrl: locationData.directionsUrlForPractitioner,
            visitAddress: locationData.visitAddress,
            locationKind: locationData.locationKind,
            sessionPrice: session.price ?? undefined,
            paymentStatus: session.payment_status ?? undefined,
            sessionStatus: session.status ?? undefined,
          },
        }),
      ]);

      const failed = results.filter((x) => !x.ok);
      if (failed.length === results.length) {
        return new Response(
          JSON.stringify({
            error: "send-email failed for all mobile_accept recipients",
            details: failed.map((f) => ("details" in f ? f.details : "")),
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          sent: results.length - failed.length,
          failed: failed.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!["cancellation", "rescheduling", "confirmation"].includes(emailType)) {
      return new Response(
        JSON.stringify({
          error:
            "emailType must be cancellation, rescheduling, confirmation, mobile_accept, mobile_decline, or mobile_expired",
        }),
        {
          status: 400,
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
            paymentCollection: session.payment_collection,
            isPayAtClinic: session.payment_collection === "in_person",
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

    if (emailType === "confirmation") {
      // Pay-at-clinic / in-person booking from BookingFlow has no Stripe webhook
      // to fire `booking_confirmation_*` emails. This branch closes that gap by
      // sending both the client and the practitioner copy from a single call.
      if (!practitioner.email) {
        return new Response(
          JSON.stringify({ error: "Practitioner has no email on file" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const baseData = {
        sessionId: session.id,
        sessionType: session.session_type ?? undefined,
        sessionDate: session.session_date,
        sessionTime,
        sessionDuration: session.duration_minutes ?? 60,
        practitionerName,
        sessionLocation: locationData.sessionLocation || undefined,
        directionsUrl: locationData.directionsUrlForClient,
        visitAddress: locationData.visitAddress,
        bookingUrl,
        paymentCollection: session.payment_collection,
        isPayAtClinic: session.payment_collection === "in_person",
      };

      const invokeSendEmail = async (payload: {
        emailType: string;
        recipientEmail: string;
        recipientName?: string;
        data: Record<string, unknown>;
      }) => {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const text = await r.text();
          console.warn(
            "send-booking-notification confirmation: send-email failed",
            payload.emailType,
            r.status,
            text,
          );
          return { ok: false as const, status: r.status, details: text };
        }
        return { ok: true as const };
      };

      const results = await Promise.all([
        invokeSendEmail({
          emailType: "booking_confirmation_client",
          recipientEmail: session.client_email,
          recipientName: session.client_name ?? undefined,
          data: baseData,
        }),
        invokeSendEmail({
          emailType: "booking_confirmation_practitioner",
          recipientEmail: practitioner.email,
          recipientName: practitionerName,
          data: {
            ...baseData,
            clientName: session.client_name,
            clientEmail: session.client_email ?? undefined,
            directionsUrl: locationData.directionsUrlForPractitioner,
          },
        }),
      ]);

      const failed = results.filter((x) => !x.ok);
      if (failed.length === results.length) {
        return new Response(
          JSON.stringify({
            error: "send-email failed for all recipients",
            details: failed.map((f) => ("details" in f ? f.details : "")),
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          sent: results.length - failed.length,
          failed: failed.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
            paymentCollection: session.payment_collection,
            isPayAtClinic: session.payment_collection === "in_person",
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
