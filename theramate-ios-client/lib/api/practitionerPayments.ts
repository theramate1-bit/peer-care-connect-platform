/**
 * Practitioner-side `payments` rows (money received for sessions / products).
 * RLS: therapists can read rows where `therapist_id` = auth.uid().
 */

import { supabase } from "@/lib/supabase";

export type PractitionerPaymentRow = {
  id: string;
  amount: number | null;
  currency: string | null;
  payment_status: string | null;
  payment_type: string | null;
  practitioner_amount: number | null;
  transfer_amount: number | null;
  application_fee: number | null;
  created_at: string | null;
  session_id: string | null;
};

/** Smallest currency unit (e.g. pence) → display amount. */
export function formatMinorCurrency(
  minor: number | null | undefined,
  currency: string | null | undefined,
): string {
  const n = minor ?? 0;
  const cur = (currency ?? "gbp").toLowerCase();
  const major = n / 100;
  if (cur === "gbp") return `£${major.toFixed(2)}`;
  if (cur === "eur") return `€${major.toFixed(2)}`;
  if (cur === "usd") return `$${major.toFixed(2)}`;
  return `${major.toFixed(2)} ${cur.toUpperCase()}`;
}

/** Net to practitioner when columns are populated; else gross `amount`. */
export function practitionerDisplayMinor(p: PractitionerPaymentRow): number {
  if (p.practitioner_amount != null) return p.practitioner_amount;
  if (p.transfer_amount != null) return p.transfer_amount;
  return p.amount ?? 0;
}

const PAYMENT_SELECT =
  "id, amount, currency, payment_status, payment_type, practitioner_amount, transfer_amount, application_fee, created_at, session_id";

export async function fetchPaymentsReceivedByTherapist(params: {
  therapistId: string;
  limit?: number;
}): Promise<{ data: PractitionerPaymentRow[]; error: Error | null }> {
  try {
    const lim = Math.min(100, Math.max(1, params.limit ?? 30));
    const byId = new Map<string, PractitionerPaymentRow>();

    const { data: byTherapist, error: tErr } = await supabase
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("therapist_id", params.therapistId)
      .order("created_at", { ascending: false })
      .limit(lim);
    if (tErr) throw tErr;
    for (const row of byTherapist || []) {
      byId.set((row as PractitionerPaymentRow).id, row as PractitionerPaymentRow);
    }

    const { data: sessions, error: sErr } = await supabase
      .from("client_sessions")
      .select("id")
      .eq("therapist_id", params.therapistId)
      .order("session_date", { ascending: false })
      .limit(500);
    if (sErr) throw sErr;
    const sessionIds = (sessions || []).map((r) => (r as { id: string }).id);

    if (sessionIds.length > 0) {
      const { data: bySession, error: pErr } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(Math.max(lim, 60));
      if (pErr) throw pErr;
      for (const row of bySession || []) {
        byId.set((row as PractitionerPaymentRow).id, row as PractitionerPaymentRow);
      }
    }

    const merged = [...byId.values()].sort((a, b) => {
      const at = a.created_at ?? "";
      const bt = b.created_at ?? "";
      return bt.localeCompare(at);
    });
    return { data: merged.slice(0, lim), error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export type TherapistPaymentMonthSnapshot = {
  paymentCount: number;
  netPence: number;
  grossPence: number;
  currency: string | null;
};

function includePaymentInMonthTotals(p: PractitionerPaymentRow): boolean {
  const st = (p.payment_status || "").toLowerCase();
  if (["failed", "cancelled", "canceled", "refunded"].includes(st)) return false;
  return true;
}

/** Sum payments created this calendar month (local device month) visible to the therapist. */
export async function fetchTherapistPaymentsMonthToDate(
  therapistId: string,
): Promise<{
  data: TherapistPaymentMonthSnapshot | null;
  error: Error | null;
}> {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(y, mo + 1, 0).getDate();
    const sessionFrom = `${y}-${pad(mo + 1)}-01`;
    const sessionTo = `${y}-${pad(mo + 1)}-${pad(lastDay)}`;

    const monthStart = new Date(y, mo, 1, 0, 0, 0, 0);
    const monthNext = new Date(y, mo + 1, 1, 0, 0, 0, 0);
    const isoStart = monthStart.toISOString();
    const isoEndExclusive = monthNext.toISOString();

    const byId = new Map<string, PractitionerPaymentRow>();

    const { data: byTherapist, error: tErr } = await supabase
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("therapist_id", therapistId)
      .gte("created_at", isoStart)
      .lt("created_at", isoEndExclusive)
      .limit(500);
    if (tErr) throw tErr;
    for (const row of byTherapist || []) {
      byId.set((row as PractitionerPaymentRow).id, row as PractitionerPaymentRow);
    }

    const { data: monthSessions, error: msErr } = await supabase
      .from("client_sessions")
      .select("id")
      .eq("therapist_id", therapistId)
      .gte("session_date", sessionFrom)
      .lte("session_date", sessionTo)
      .limit(400);
    if (msErr) throw msErr;
    const sessionIds = (monthSessions || []).map((r) => (r as { id: string }).id);

    if (sessionIds.length > 0) {
      const { data: bySession, error: pErr } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .in("session_id", sessionIds)
        .gte("created_at", isoStart)
        .lt("created_at", isoEndExclusive)
        .limit(500);
      if (pErr) throw pErr;
      for (const row of bySession || []) {
        byId.set((row as PractitionerPaymentRow).id, row as PractitionerPaymentRow);
      }
    }

    let netPence = 0;
    let grossPence = 0;
    let currency: string | null = null;
    let paymentCount = 0;

    for (const p of byId.values()) {
      if (!includePaymentInMonthTotals(p)) continue;
      paymentCount += 1;
      grossPence += p.amount ?? 0;
      netPence += practitionerDisplayMinor(p);
      if (!currency && p.currency) currency = p.currency;
    }

    return {
      data: {
        paymentCount,
        netPence,
        grossPence,
        currency: currency ?? "gbp",
      },
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
