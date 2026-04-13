import { supabase } from "@/lib/supabase";

export type CustomReportRow = {
  id: string;
  user_id: string;
  report_name: string;
  report_description: string | null;
  report_type: string;
  report_config: unknown;
  schedule_frequency: string | null;
  schedule_config: unknown;
  last_generated_at: string | null;
  next_generation_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ReportDeliveryRow = {
  id: string;
  report_id: string;
  delivery_date: string | null;
  delivery_method: string;
  delivery_status: string | null;
  recipient_email: string | null;
  file_path: string | null;
  file_size: number | null;
  delivery_notes: string | null;
  created_at: string | null;
};

export async function fetchMyCustomReports(userId: string): Promise<{
  data: CustomReportRow[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("custom_reports")
      .select(
        "id, user_id, report_name, report_description, report_type, report_config, schedule_frequency, schedule_config, last_generated_at, next_generation_at, is_active, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data: (data || []) as CustomReportRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function fetchReportDeliveriesForReports(
  reportIds: string[],
  limit = 50,
): Promise<{ data: ReportDeliveryRow[]; error: Error | null }> {
  try {
    const ids = [...new Set(reportIds)].filter(Boolean);
    if (ids.length === 0) return { data: [], error: null };
    const { data, error } = await supabase
      .from("report_deliveries")
      .select(
        "id, report_id, delivery_date, delivery_method, delivery_status, recipient_email, file_path, file_size, delivery_notes, created_at",
      )
      .in("report_id", ids)
      .order("delivery_date", { ascending: false })
      .limit(Math.max(1, limit));
    if (error) throw error;
    return { data: (data || []) as ReportDeliveryRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

