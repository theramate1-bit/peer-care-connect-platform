import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyEarningsRow {
  month: string;
  label: string;
  amountPence: number;
}

export interface EarningsData {
  thisMonthPence: number;
  thisYearPence: number;
  monthlyBreakdown: MonthlyEarningsRow[];
}

const penceToPounds = (pence: number) => (pence ?? 0) / 100;

export function useEarnings(therapistId: string | undefined) {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEarnings = useCallback(async () => {
    if (!therapistId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: raw, error: rpcError } = await supabase.rpc("get_practitioner_earnings", {
        p_therapist_id: therapistId,
      });

      if (rpcError) {
        throw rpcError;
      }

      if (!raw) {
        setData({
          thisMonthPence: 0,
          thisYearPence: 0,
          monthlyBreakdown: [],
        });
        setLoading(false);
        return;
      }

      const monthlyBreakdown = Array.isArray(raw.monthly_breakdown)
        ? (raw.monthly_breakdown as Array<{ month: string; label: string; amount_pence: number }>).map(
            (row) => ({
              month: row.month,
              label: row.label,
              amountPence: Number(row.amount_pence) || 0,
            })
          )
        : [];

      setData({
        thisMonthPence: Number(raw.this_month_pence) || 0,
        thisYearPence: Number(raw.this_year_pence) || 0,
        monthlyBreakdown,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [therapistId]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const thisMonthPounds = data ? penceToPounds(data.thisMonthPence) : 0;
  const now = new Date();
  const dayOfMonth = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.min(dayOfMonth, totalDaysInMonth);
  const projectedMonth =
    daysElapsed > 0
      ? (thisMonthPounds / daysElapsed) * totalDaysInMonth
      : 0;

  return {
    thisMonth: thisMonthPounds,
    thisYear: data ? penceToPounds(data.thisYearPence) : 0,
    monthlyBreakdown: data?.monthlyBreakdown ?? [],
    projectedMonth,
    loading,
    error,
    refetch: fetchEarnings,
  };
}
