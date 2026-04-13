import { supabase } from "@/lib/supabase";

export type FinancialAnalyticsRow = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number | null;
  total_expenses: number | null;
  net_profit: number | null;
  profit_margin: number | null;
  average_project_value: number | null;
  payment_collection_rate: number | null;
  outstanding_invoices: number | null;
  created_at: string | null;
};

export type EngagementAnalyticsRow = {
  id: string;
  user_id: string;
  metric_date: string;
  login_frequency: number | null;
  session_duration_minutes: number | null;
  features_used: string[] | null;
  messages_sent: number | null;
  documents_uploaded: number | null;
  reviews_submitted: number | null;
  support_tickets: number | null;
  created_at: string | null;
};

export type PerformanceMetricsRow = {
  id: string;
  user_id: string;
  metric_date: string;
  client_satisfaction_score: number | null;
  response_time_hours: number | null;
  total_projects_completed: number | null;
  total_revenue: number | null;
  created_at: string | null;
};

function monthRangeISO(d = new Date()): { start: string; end: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const toDate = (x: Date) => x.toISOString().slice(0, 10);
  return { start: toDate(start), end: toDate(end) };
}

export async function fetchMyFinancialAnalyticsThisMonth(userId: string): Promise<{
  data: FinancialAnalyticsRow | null;
  error: Error | null;
}> {
  try {
    const { start, end } = monthRangeISO();
    const { data, error } = await supabase
      .from("financial_analytics")
      .select(
        "id, user_id, period_start, period_end, total_revenue, total_expenses, net_profit, profit_margin, average_project_value, payment_collection_rate, outstanding_invoices, created_at",
      )
      .eq("user_id", userId)
      .gte("period_start", start)
      .lte("period_end", end)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return { data: (data || null) as FinancialAnalyticsRow | null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function fetchMyEngagementAnalyticsLastNDays(params: {
  userId: string;
  days?: number;
}): Promise<{ data: EngagementAnalyticsRow[]; error: Error | null }> {
  try {
    const days = Math.max(1, params.days ?? 30);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const sinceISO = since.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("engagement_analytics")
      .select(
        "id, user_id, metric_date, login_frequency, session_duration_minutes, features_used, messages_sent, documents_uploaded, reviews_submitted, support_tickets, created_at",
      )
      .eq("user_id", params.userId)
      .gte("metric_date", sinceISO)
      .order("metric_date", { ascending: false })
      .limit(days);
    if (error) throw error;
    return { data: (data || []) as EngagementAnalyticsRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function fetchMyLatestPerformanceMetrics(userId: string): Promise<{
  data: PerformanceMetricsRow | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("performance_metrics")
      .select(
        "id, user_id, metric_date, client_satisfaction_score, response_time_hours, total_projects_completed, total_revenue, created_at",
      )
      .eq("user_id", userId)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return { data: (data || null) as PerformanceMetricsRow | null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

