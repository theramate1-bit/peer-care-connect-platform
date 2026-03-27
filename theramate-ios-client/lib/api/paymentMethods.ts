import { supabase } from "@/lib/supabase";

export type PaymentMethodSummary = {
  value: string;
  source: "stripe_payments" | "payment_transactions" | "client_sessions";
};

export type PaymentAccountSummary = {
  stripe_customer_id: string | null;
  email: string | null;
};

export async function fetchPaymentAccountSummary(userId: string): Promise<{
  data: PaymentAccountSummary | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("stripe_customer_id, email")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { data: null, error: null };
    return {
      data: {
        stripe_customer_id:
          (data as { stripe_customer_id: string | null }).stripe_customer_id ||
          null,
        email: (data as { email: string | null }).email || null,
      },
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: err };
  }
}

export async function fetchPaymentMethodSummaries(userId: string): Promise<{
  data: PaymentMethodSummary[];
  error: Error | null;
}> {
  try {
    const found: PaymentMethodSummary[] = [];
    const seen = new Set<string>();

    const add = (
      value: string | null | undefined,
      source: PaymentMethodSummary["source"],
    ) => {
      const clean = (value || "").trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      found.push({ value: clean, source });
    };

    const { data: stripeRows } = await supabase
      .from("stripe_payments")
      .select("payment_method")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    for (const r of (stripeRows || []) as Array<{
      payment_method: string | null;
    }>) {
      add(r.payment_method, "stripe_payments");
    }

    const { data: transactionRows } = await supabase
      .from("payment_transactions")
      .select("payment_method")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    for (const r of (transactionRows || []) as Array<{
      payment_method: string | null;
    }>) {
      add(r.payment_method, "payment_transactions");
    }

    const { data: sessionRows } = await supabase
      .from("client_sessions")
      .select("payment_method")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    for (const r of (sessionRows || []) as Array<{
      payment_method: string | null;
    }>) {
      add(r.payment_method, "client_sessions");
    }

    return { data: found, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}
