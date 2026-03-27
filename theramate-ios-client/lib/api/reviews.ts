import { supabase } from "@/lib/supabase";

export async function hasSessionReview(params: {
  clientId: string;
  sessionId: string;
}): Promise<{ reviewed: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id")
      .eq("client_id", params.clientId)
      .eq("session_id", params.sessionId)
      .maybeSingle();
    if (error) throw error;
    return { reviewed: !!data, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { reviewed: false, error: err };
  }
}

export async function submitSessionReview(params: {
  clientId: string;
  sessionId: string;
  therapistId: string;
  rating: number;
  comment: string;
  isPublic: boolean;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const normalizedRating = Math.max(
      1,
      Math.min(5, Math.round(params.rating)),
    );
    const { error } = await supabase.from("reviews").insert({
      therapist_id: params.therapistId,
      client_id: params.clientId,
      session_id: params.sessionId,
      rating: normalizedRating,
      comment: params.comment.trim() || null,
      is_public: params.isPublic,
    });
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, error: err };
  }
}

export type MyReviewItem = {
  id: string;
  therapist_id: string;
  therapist_name: string;
  session_id: string | null;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string | null;
};

export async function fetchMyReviews(clientId: string): Promise<{
  data: MyReviewItem[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select(
        "id, therapist_id, session_id, rating, comment, is_public, created_at",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data || []) as Array<{
      id: string;
      therapist_id: string;
      session_id: string | null;
      rating: number;
      comment: string | null;
      is_public: boolean | null;
      created_at: string | null;
    }>;

    const therapistIds = [...new Set(rows.map((r) => r.therapist_id))];
    const names = new Map<string, string>();
    if (therapistIds.length > 0) {
      const { data: therapists, error: tErr } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", therapistIds);
      if (tErr) throw tErr;
      for (const t of (therapists || []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
      }>) {
        names.set(
          t.id,
          `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Therapist",
        );
      }
    }

    return {
      data: rows.map((r) => ({
        ...r,
        therapist_name: names.get(r.therapist_id) || "Therapist",
        is_public: r.is_public === true,
      })),
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export type TherapistReviewSnippet = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};

export async function fetchTherapistPublicReviews(params: {
  therapistId: string;
  limit?: number;
}): Promise<{ data: TherapistReviewSnippet[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("therapist_id", params.therapistId)
      .eq("is_public", true)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 3);
    if (error) throw error;
    return { data: (data || []) as TherapistReviewSnippet[], error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}
