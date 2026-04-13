import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

type JsonObject = Record<string, unknown>;

function json(origin: string | null, status: number, payload: JsonObject) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function safeName(s: string) {
  return (s || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "report";
}

function monthRangeISO(d = new Date()): { start: string; end: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const toDate = (x: Date) => x.toISOString().slice(0, 10);
  return { start: toDate(start), end: toDate(end) };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json(origin, 405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(origin, 500, { error: "Missing Supabase env" });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: authErr,
    } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return json(origin, 401, { error: "Unauthorized" });
    }

    const body = (await req.json().catch(() => ({}))) as {
      report_id?: string;
    };
    const reportId = (body.report_id || "").trim();
    if (!reportId) {
      return json(origin, 400, { error: "Missing report_id" });
    }

    // Ensure the user owns the report
    const { data: report, error: repErr } = await supabaseAdmin
      .from("custom_reports")
      .select("id, user_id, report_name, report_type, report_config")
      .eq("id", reportId)
      .maybeSingle();
    if (repErr) return json(origin, 500, { error: repErr.message });
    if (!report || report.user_id !== user.id) {
      return json(origin, 403, { error: "Not authorized for this report" });
    }

    // Create delivery row first
    const { data: delivery, error: delErr } = await supabaseAdmin
      .from("report_deliveries")
      .insert({
        report_id: reportId,
        delivery_method: "export",
        delivery_status: "generated",
      })
      .select("id, report_id, created_at")
      .single();
    if (delErr) return json(origin, 500, { error: delErr.message });

    // Build payload snapshot (minimal, deterministic)
    const { start, end } = monthRangeISO();
    const [financialRes, performanceRes, engagementRes] = await Promise.all([
      supabaseAdmin
        .from("financial_analytics")
        .select("*")
        .eq("user_id", user.id)
        .gte("period_start", start)
        .lte("period_end", end)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("performance_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("metric_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("engagement_analytics")
        .select("*")
        .eq("user_id", user.id)
        .order("metric_date", { ascending: false })
        .limit(30),
    ]);

    const payload = {
      generated_at: new Date().toISOString(),
      report: {
        id: report.id,
        name: report.report_name,
        type: report.report_type,
        config: report.report_config,
      },
      snapshot: {
        financial_month: financialRes.data ?? null,
        performance_latest: performanceRes.data ?? null,
        engagement_last_30d: engagementRes.data ?? [],
      },
      warnings: [
        financialRes.error ? `financial_analytics: ${financialRes.error.message}` : null,
        performanceRes.error ? `performance_metrics: ${performanceRes.error.message}` : null,
        engagementRes.error ? `engagement_analytics: ${engagementRes.error.message}` : null,
      ].filter(Boolean),
    };

    const jsonText = JSON.stringify(payload, null, 2);
    const bytes = new TextEncoder().encode(jsonText);

    const objectPath = `users/${user.id}/reports/${reportId}/${delivery.id}/${safeName(
      report.report_name,
    )}.json`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("report-exports")
      .upload(objectPath, bytes, {
        contentType: "application/json",
        upsert: true,
      });
    if (upErr) return json(origin, 500, { error: upErr.message });

    const { error: updErr } = await supabaseAdmin
      .from("report_deliveries")
      .update({
        file_path: objectPath,
        file_size: bytes.length,
        delivery_notes: "Generated from mobile export endpoint",
      })
      .eq("id", delivery.id);
    if (updErr) return json(origin, 500, { error: updErr.message });

    return json(origin, 200, {
      ok: true,
      delivery_id: delivery.id,
      file_path: objectPath,
      bytes: bytes.length,
    });
  } catch (e) {
    return json(origin, 500, {
      error: "Internal error",
      details: e instanceof Error ? e.message : String(e),
    });
  }
});

