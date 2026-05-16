/**
 * Discover practitioners for treatment exchange + send requests.
 * Eligibility uses `therapist_profiles.average_rating` for tier matching (DB source of truth).
 * Sends use RPC `create_treatment_exchange_request` (RLS-safe + notification).
 */

import { supabase } from "@/lib/supabase";
import { THERAPIST_ROLES } from "@/lib/api/marketplace";
import { fetchMyCredits } from "@/lib/api/credits";

export type EligibleExchangePractitioner = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  user_role: string | null;
  average_rating: number | null;
  location: string | null;
  profile_photo_url: string | null;
  services_offered: string[] | null;
};

/** Tier 0: under 2★, tier 1: 2–3.99★, tier 2: 4+★ — aligns with web bucket labels. */
export function ratingTier(
  averageRating: number | null | undefined,
): 0 | 1 | 2 {
  const r = averageRating ?? 0;
  if (r >= 4) return 2;
  if (r >= 2) return 1;
  return 0;
}

export async function fetchRequesterRatingTier(
  requesterId: string,
): Promise<{ tier: 0 | 1 | 2; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("therapist_profiles")
      .select("average_rating")
      .eq("user_id", requesterId)
      .maybeSingle();
    if (error) throw error;
    const row = data as { average_rating: number | null } | null;
    return { tier: ratingTier(row?.average_rating ?? null), error: null };
  } catch (e) {
    return {
      tier: 0,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

function profileRow(
  raw: unknown,
): { average_rating: number | null; profile_photo_url: string | null } | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first || typeof first !== "object") return null;
    const o = first as Record<string, unknown>;
    return {
      average_rating:
        typeof o.average_rating === "number" ? o.average_rating : null,
      profile_photo_url:
        typeof o.profile_photo_url === "string" ? o.profile_photo_url : null,
    };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return {
      average_rating:
        typeof o.average_rating === "number" ? o.average_rating : null,
      profile_photo_url:
        typeof o.profile_photo_url === "string" ? o.profile_photo_url : null,
    };
  }
  return null;
}

/**
 * Eligible peers: therapist roles, opted in, completed onboarding, active,
 * same rating tier as requester. Client-side search/filter can narrow further.
 */
export async function fetchEligibleExchangePractitioners(params: {
  requesterId: string;
}): Promise<{ data: EligibleExchangePractitioner[]; error: Error | null }> {
  try {
    const { tier: myTier, error: te } = await fetchRequesterRatingTier(
      params.requesterId,
    );
    if (te) console.warn("[exchange] requester tier:", te.message);

    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        user_role,
        location,
        services_offered,
        treatment_exchange_opt_in,
        onboarding_status,
        is_active,
        therapist_profiles ( average_rating, profile_photo_url )
      `,
      )
      .neq("id", params.requesterId)
      .in("user_role", [...THERAPIST_ROLES])
      .eq("treatment_exchange_opt_in", true)
      .eq("onboarding_status", "completed")
      .eq("is_active", true);

    if (error) throw error;

    const rows = (data || []) as Record<string, unknown>[];
    const out: EligibleExchangePractitioner[] = [];

    for (const r of rows) {
      const id = String(r.id);
      const role = r.user_role as string | null | undefined;

      const tp = profileRow(r.therapist_profiles);
      const ar = tp?.average_rating ?? null;
      if (ratingTier(ar) !== myTier) continue;

      const rawServices = r.services_offered;
      const services_offered = Array.isArray(rawServices)
        ? (rawServices as string[])
        : null;

      out.push({
        id,
        user_id: id,
        first_name: (r.first_name as string) ?? null,
        last_name: (r.last_name as string) ?? null,
        user_role: role ?? null,
        average_rating: ar,
        location: (r.location as string) ?? null,
        profile_photo_url: tp?.profile_photo_url ?? null,
        services_offered,
      });
    }

    return { data: out, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export type SendExchangeRequestInput = {
  requesterId: string;
  recipientUserId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  durationMinutes: number;
  sessionType?: string;
  notes?: string;
};

/**
 * Server RPC validates credits, tier, recipient opt-in; creates row + notifies recipient.
 */
export async function sendTreatmentExchangeRequest(
  input: SendExchangeRequestInput,
): Promise<{ ok: boolean; requestId: string | null; error: Error | null }> {
  const duration = Math.max(1, Math.floor(input.durationMinutes));
  try {
    const { data: creditRow, error: cErr } = await fetchMyCredits(
      input.requesterId,
    );
    if (cErr) throw cErr;
    const balance = creditRow?.current_balance ?? creditRow?.balance ?? 0;
    if (balance < duration) {
      return {
        ok: false,
        requestId: null,
        error: new Error(
          `Insufficient credits. You need ${duration} credits (${duration} min) but have ${balance}.`,
        ),
      };
    }

    const st = input.startTime.trim();
    const pStart = st.length === 5 && st.includes(":") ? `${st}:00` : st;

    const { data: rpcId, error } = await supabase.rpc(
      "create_treatment_exchange_request",
      {
        p_recipient_id: input.recipientUserId,
        p_session_date: input.sessionDate,
        p_start_time: pStart,
        p_duration_minutes: duration,
        p_session_type: input.sessionType?.trim() || null,
        p_requester_notes: input.notes?.trim() || null,
      },
    );

    if (error) throw error;
    const requestId =
      typeof rpcId === "string" ? rpcId : rpcId != null ? String(rpcId) : null;
    return { ok: true, requestId, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      requestId: null,
      error: new Error(msg),
    };
  }
}
