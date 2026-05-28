import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminAccess } from "../_shared/admin-auth.ts";
import { isSmsMeteringEnabled, postStripeSmsMeterEvent } from "../_shared/sms-metering.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface SmsMeterCandidate {
  id: string;
  practitioner_id: string | null;
  meter_post_attempts: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authResult = await verifyAdminAccess(req, Deno.env.get("CRON_ALLOWED_ORIGINS")?.split(","));
  if (!authResult.isAdmin) {
    return new Response(
      JSON.stringify({ success: false, error: authResult.error || "Unauthorized" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const meteringEnabled = isSmsMeteringEnabled();
    if (!meteringEnabled) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "metering_disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: pendingRows, error } = await supabase
      .from("sms_logs")
      .select("id,practitioner_id,meter_post_attempts")
      .eq("billable", true)
      .is("stripe_meter_event_id", null)
      .lt("meter_post_attempts", 5)
      .order("sent_at", { ascending: true })
      .limit(500);

    if (error) {
      throw error;
    }

    let posted = 0;
    let failed = 0;
    let skipped = 0;
    const failures: Array<{ smsLogId: string; error: string }> = [];

    for (const row of (pendingRows || []) as SmsMeterCandidate[]) {
      if (!row.practitioner_id) {
        skipped += 1;
        await supabase
          .from("sms_logs")
          .update({
            meter_post_attempts: row.meter_post_attempts + 1,
            meter_post_last_error: "Missing practitioner_id",
          })
          .eq("id", row.id);
        continue;
      }

      const { data: customerRow } = await supabase
        .from("customers")
        .select("stripe_customer_id")
        .eq("user_id", row.practitioner_id)
        .maybeSingle();

      if (!customerRow?.stripe_customer_id) {
        failed += 1;
        await supabase
          .from("sms_logs")
          .update({
            meter_post_attempts: row.meter_post_attempts + 1,
            meter_post_last_error: "Missing stripe_customer_id for practitioner",
          })
          .eq("id", row.id);
        continue;
      }

      try {
        const meterEvent = await postStripeSmsMeterEvent(customerRow.stripe_customer_id, row.id);
        posted += 1;
        await supabase
          .from("sms_logs")
          .update({
            stripe_meter_event_id: meterEvent.meterEventId,
            meter_post_last_error: null,
          })
          .eq("id", row.id);
      } catch (postError) {
        failed += 1;
        const errorMessage = (postError as Error).message;
        failures.push({ smsLogId: row.id, error: errorMessage });
        await supabase
          .from("sms_logs")
          .update({
            meter_post_attempts: row.meter_post_attempts + 1,
            meter_post_last_error: errorMessage,
          })
          .eq("id", row.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: pendingRows?.length || 0,
        posted,
        failed,
        skipped,
        failures,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("reconcile-sms-meter-events error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
