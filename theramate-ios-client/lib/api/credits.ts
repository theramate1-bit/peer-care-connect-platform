import { supabase } from "@/lib/supabase";

export type CreditsRow = {
  user_id: string;
  balance: number | null;
  current_balance: number | null;
  total_earned: number | null;
  total_spent: number | null;
  updated_at: string | null;
};

export type CreditTransactionRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  description: string | null;
  session_id: string | null;
  metadata: unknown;
  created_at: string | null;
};

export async function fetchMyCredits(userId: string): Promise<{
  data: CreditsRow | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("credits")
      .select("user_id, balance, current_balance, total_earned, total_spent, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return { data: (data || null) as CreditsRow | null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function fetchMyCreditTransactions(params: {
  userId: string;
  limit?: number;
}): Promise<{ data: CreditTransactionRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("credit_transactions")
      .select(
        "id, user_id, transaction_type, amount, balance_before, balance_after, description, session_id, metadata, created_at",
      )
      .eq("user_id", params.userId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, params.limit ?? 30));
    if (error) throw error;
    return { data: (data || []) as CreditTransactionRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

