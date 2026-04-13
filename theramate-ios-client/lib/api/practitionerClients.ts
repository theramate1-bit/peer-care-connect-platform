/**
 * Distinct clients for a practitioner (from `client_sessions`).
 */

import { supabase } from "@/lib/supabase";

export type PractitionerClientSummary = {
  client_id: string;
  name: string;
  email: string | null;
  session_count: number;
  last_session_date: string | null;
};

export async function fetchPractitionerClients(therapistId: string): Promise<{
  data: PractitionerClientSummary[];
  error: Error | null;
}> {
  try {
    const { data: rows, error } = await supabase
      .from("client_sessions")
      .select("client_id, session_date")
      .eq("therapist_id", therapistId)
      .not("client_id", "is", null);

    if (error) throw error;

    type Row = { client_id: string | null; session_date: string | null };
    const list = (rows || []) as Row[];

    const byClient = new Map<
      string,
      { count: number; last: string | null }
    >();
    for (const r of list) {
      if (!r.client_id) continue;
      const cur = byClient.get(r.client_id) || { count: 0, last: null };
      cur.count += 1;
      if (r.session_date) {
        if (!cur.last || r.session_date > cur.last) cur.last = r.session_date;
      }
      byClient.set(r.client_id, cur);
    }

    const ids = [...byClient.keys()];
    if (ids.length === 0) return { data: [], error: null };

    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", ids);
    if (uErr) throw uErr;

    const summaries: PractitionerClientSummary[] = [];
    for (const u of (users || []) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }[]) {
      const agg = byClient.get(u.id);
      if (!agg) continue;
      summaries.push({
        client_id: u.id,
        name:
          `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Client",
        email: u.email,
        session_count: agg.count,
        last_session_date: agg.last,
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
