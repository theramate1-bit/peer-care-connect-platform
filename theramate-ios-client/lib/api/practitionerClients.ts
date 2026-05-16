/**
 * Client roster for a practitioner — matches web `PracticeClientManagement` list source:
 * sessions with `payment_status` in completed/paid, excluding cancelled/no_show and peer exchanges,
 * grouped by normalized email (same as web).
 */

import { supabase } from "@/lib/supabase";

/** Normalizes email like web (gmail/googlemail). */
export function normalizeClientEmail(email: string): string {
  return email.trim().toLowerCase().replace("@googlemail.com", "@gmail.com");
}

export type ClientEngagementStatus = "active" | "inactive" | "new";

/** Heuristic engagement label (web UI exposes the same filter; values are computed locally). */
export function computeClientEngagementStatus(
  lastSessionDate: string | null,
  sessionCount: number,
): ClientEngagementStatus {
  if (!lastSessionDate) return "new";
  const days = (Date.now() - new Date(lastSessionDate).getTime()) / 86400000;
  if (sessionCount <= 2 && days <= 42) return "new";
  if (days > 90) return "inactive";
  return "active";
}

export type PractitionerClientSummary = {
  /** Stable list key: UUID or `email:<normalized>` for guest-only rows */
  key: string;
  client_id: string | null;
  name: string;
  email: string | null;
  session_count: number;
  last_session_date: string | null;
  /** Sum of `price` from qualifying sessions (aligned with web header totals). */
  total_spent: number;
  status: ClientEngagementStatus;
};

type Agg = {
  normEmail: string;
  displayEmail: string;
  client_id: string | null;
  client_name: string;
  count: number;
  spent: number;
  last: string | null;
};

export async function fetchPractitionerClients(therapistId: string): Promise<{
  data: PractitionerClientSummary[];
  error: Error | null;
}> {
  try {
    const { data: rows, error } = await supabase
      .from("client_sessions")
      .select("client_id, client_email, client_name, session_date, price")
      .eq("therapist_id", therapistId)
      .in("payment_status", ["completed", "paid"])
      .not("status", "eq", "cancelled")
      .not("status", "eq", "no_show")
      .eq("is_peer_booking", false);

    if (error) throw error;

    type Row = {
      client_id: string | null;
      client_email: string | null;
      client_name: string | null;
      session_date: string | null;
      price: number | null;
    };

    const groups = new Map<string, Agg>();

    for (const r of (rows || []) as Row[]) {
      const email = (r.client_email || "").trim();
      if (!email) continue;

      const norm = normalizeClientEmail(email);
      let g = groups.get(norm);
      if (!g) {
        g = {
          normEmail: norm,
          displayEmail: email,
          client_id: r.client_id,
          client_name: (r.client_name || "").trim() || "Client",
          count: 0,
          spent: 0,
          last: null,
        };
        groups.set(norm, g);
      }

      g.count += 1;
      g.spent += Number(r.price) || 0;
      if (r.client_id) g.client_id = r.client_id;
      if (r.session_date) {
        if (!g.last || r.session_date > g.last) g.last = r.session_date;
      }
      const cn = (r.client_name || "").trim();
      if (cn) g.client_name = cn;
    }

    const clientIds = [
      ...new Set(
        [...groups.values()]
          .map((a) => a.client_id)
          .filter((id): id is string => !!id),
      ),
    ];

    const userById = new Map<
      string,
      {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    >();

    if (clientIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", clientIds);
      if (uErr) throw uErr;
      for (const u of (users || []) as {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }[]) {
        userById.set(u.id, u);
      }
    }

    const summaries: PractitionerClientSummary[] = [];

    for (const g of groups.values()) {
      let name = g.client_name;
      let emailOut: string | null = g.displayEmail;

      if (g.client_id && userById.has(g.client_id)) {
        const u = userById.get(g.client_id)!;
        const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
        if (full) name = full;
        if (u.email) emailOut = u.email;
      }

      const key = g.client_id ?? `email:${g.normEmail}`;

      summaries.push({
        key,
        client_id: g.client_id,
        name,
        email: emailOut,
        session_count: g.count,
        last_session_date: g.last,
        total_spent: Math.round(g.spent * 100) / 100,
        status: computeClientEngagementStatus(g.last, g.count),
      });
    }

    summaries.sort((a, b) =>
      (b.last_session_date || "").localeCompare(a.last_session_date || ""),
    );

    return { data: summaries, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
