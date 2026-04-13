import { supabase } from "@/lib/supabase";

export type ConnectAccountRow = {
  id: string;
  user_id: string;
  stripe_account_id: string;
  account_status: string | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  details_submitted: boolean | null;
  updated_at: string | null;
};

export type PayoutRow = {
  id: string;
  connect_account_id: string;
  stripe_payout_id: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  arrival_date: string | null;
  created_at: string | null;
};

export async function fetchMyConnectAccount(userId: string): Promise<{
  data: ConnectAccountRow | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("connect_accounts")
      .select(
        "id, user_id, stripe_account_id, account_status, charges_enabled, payouts_enabled, details_submitted, updated_at",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return { data: (data || null) as ConnectAccountRow | null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function fetchMyPayouts(params: {
  userId: string;
  limit?: number;
}): Promise<{ data: PayoutRow[]; error: Error | null }> {
  try {
    const { data: acct, error: aErr } = await fetchMyConnectAccount(params.userId);
    if (aErr) throw aErr;
    if (!acct?.id) return { data: [], error: null };

    const { data, error } = await supabase
      .from("payouts")
      .select(
        "id, connect_account_id, stripe_payout_id, amount, currency, status, arrival_date, created_at",
      )
      .eq("connect_account_id", acct.id)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, params.limit ?? 20));
    if (error) throw error;
    return { data: (data || []) as PayoutRow[], error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

