import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyAdminAccess } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-07-30.basil",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authResult = await verifyAdminAccess(req);
  if (!authResult.isAdmin) {
    return new Response(
      JSON.stringify({ success: false, error: authResult.error || "Unauthorized" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const smsPriceId = Deno.env.get("STRIPE_SMS_METERED_PRICE_ID") || "";
    if (!smsPriceId.startsWith("price_")) {
      return new Response(
        JSON.stringify({ success: false, error: "STRIPE_SMS_METERED_PRICE_ID is not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const migrationKey = `attach_sms_metered_item:${smsPriceId}`;
    const { data: existingRun } = await supabase
      .from("migration_runs")
      .select("id")
      .eq("migration_key", migrationKey)
      .maybeSingle();

    if (existingRun) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_ran" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: rows, error: rowsError } = await supabase
      .from("subscriptions")
      .select("id,stripe_subscription_id,status")
      .in("status", ["active", "past_due"]);

    if (rowsError) {
      throw rowsError;
    }

    let updated = 0;
    let alreadyAttached = 0;
    const failures: Array<{ subscriptionId: string; error: string }> = [];

    for (const row of rows || []) {
      if (!row.stripe_subscription_id) {
        continue;
      }

      try {
        const stripeSub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        const hasSmsItem = stripeSub.items.data.some((item) => item.price?.id === smsPriceId);
        if (hasSmsItem) {
          alreadyAttached += 1;
          continue;
        }

        const existingItems = stripeSub.items.data.map((item) => ({
          id: item.id,
          quantity: item.quantity ?? undefined,
        }));

        await stripe.subscriptions.update(row.stripe_subscription_id, {
          items: [...existingItems, { price: smsPriceId }],
          proration_behavior: "none",
        });

        updated += 1;
      } catch (error) {
        failures.push({
          subscriptionId: row.stripe_subscription_id,
          error: (error as Error).message,
        });
      }
    }

    await supabase.from("migration_runs").insert({
      migration_key: migrationKey,
      status: failures.length === 0 ? "completed" : "completed_with_errors",
      metadata: {
        total: rows?.length || 0,
        updated,
        alreadyAttached,
        failures,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        total: rows?.length || 0,
        updated,
        alreadyAttached,
        failures,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("attach-sms-metered-item error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
