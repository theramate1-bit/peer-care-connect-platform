import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isSmsMeteringEnabled, postStripeSmsMeterEvent } from "../_shared/sms-metering.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string;
  message: string;
  sessionId?: string;
  reminderType?: "24h" | "2h" | "1h";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(supabaseUrl, anonKey);
    const supabaseService = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const practitionerId = authData.user.id;
    const { to, message, sessionId, reminderType }: SMSRequest = await req.json();
    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to and message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid phone number format. Must be E.164 (e.g., +447123456789)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: userSettings, error: userSettingsError } = await supabaseService
      .from("users")
      .select("sms_reminders_enabled")
      .eq("id", practitionerId)
      .single();

    if (userSettingsError) {
      console.error("Failed to read user SMS settings:", userSettingsError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not verify SMS permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (userSettings.sms_reminders_enabled === false) {
      return new Response(
        JSON.stringify({ success: false, error: "SMS reminders are disabled for this account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: customerRow } = await supabaseService
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", practitionerId)
      .single();

    const { data: subscriptionRow } = await supabaseService
      .from("subscriptions")
      .select("id,status")
      .eq("user_id", practitionerId)
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!customerRow?.stripe_customer_id || !subscriptionRow) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "no_active_subscription",
          message: "An active subscription is required to send SMS reminders.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "SMS service not configured. Contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: insertedLog, error: insertError } = await supabaseService
      .from("sms_logs")
      .insert({
        practitioner_id: practitionerId,
        phone_number: to,
        message,
        session_id: sessionId,
        reminder_type: reminderType,
        status: "queued",
        billable: true,
        metadata: {
          transport: "twilio",
          to,
          from: twilioPhoneNumber,
        },
      })
      .select("id")
      .single();

    if (insertError || !insertedLog) {
      console.error("Failed to create sms_logs row:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create SMS log entry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const smsLogId = insertedLog.id;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("From", twilioPhoneNumber);
    formData.append("To", to);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      await supabaseService
        .from("sms_logs")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: twilioData?.message || "Twilio send failed",
          metadata: {
            twilio_response: twilioData,
            to,
            from: twilioPhoneNumber,
            transport: "twilio",
          },
        })
        .eq("id", smsLogId);

      return new Response(
        JSON.stringify({
          success: false,
          error: twilioData?.message || "Failed to send SMS",
          details: twilioData,
        }),
        { status: twilioResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabaseService
      .from("sms_logs")
      .update({
        twilio_message_sid: twilioData.sid,
        status: twilioData.status || "queued",
        sent_at: new Date().toISOString(),
        metadata: {
          twilio_response: twilioData,
          to,
          from: twilioPhoneNumber,
          transport: "twilio",
        },
      })
      .eq("id", smsLogId);

    let meterPosted = false;
    const meteringEnabled = isSmsMeteringEnabled();
    if (meteringEnabled) {
      try {
        const meterResult = await postStripeSmsMeterEvent(customerRow.stripe_customer_id, smsLogId);
        meterPosted = true;
        await supabaseService
          .from("sms_logs")
          .update({
            stripe_meter_event_id: meterResult.meterEventId,
            meter_post_last_error: null,
          })
          .eq("id", smsLogId);
      } catch (meterError) {
        await supabaseService
          .from("sms_logs")
          .update({
            meter_post_attempts: 1,
            meter_post_last_error: (meterError as Error).message,
          })
          .eq("id", smsLogId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
        smsLogId,
        meterPosted,
        message: "SMS sent successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("SMS send error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send SMS", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
