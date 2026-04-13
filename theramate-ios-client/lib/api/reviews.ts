import { unknownToError } from "@/lib/errors";
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
    return { reviewed: false, error: unknownToError(e) };
  }
}

export async function submitSessionReview(params: {
  clientId: string;
  sessionId: string;
  therapistId: string;
  rating: number;
  comment: string;
  /** Kept for UI; DB uses `review_status` (pending → approved). */
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
      overall_rating: normalizedRating,
      comment: params.comment.trim() || null,
      review_status: "pending",
    });
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: unknownToError(e) };
  }
}

export type MyReviewItem = {
  id: string;
  therapist_id: string;
  therapist_name: string;
  session_id: string | null;
  rating: number;
  comment: string | null;
  review_status: string;
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
        "id, therapist_id, session_id, overall_rating, comment, review_status, created_at",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data || []) as Array<{
      id: string;
      therapist_id: string;
      session_id: string | null;
      overall_rating: number | null;
      comment: string | null;
      review_status: string | null;
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
        id: r.id,
        therapist_id: r.therapist_id,
        therapist_name: names.get(r.therapist_id) || "Therapist",
        session_id: r.session_id,
        rating: Number(r.overall_rating) || 0,
        comment: r.comment,
        review_status: r.review_status || "pending",
        created_at: r.created_at,
      })),
      error: null,
    };
  } catch (e) {
    return { data: [], error: unknownToError(e) };
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
      .select("id, overall_rating, comment, created_at")
      .eq("therapist_id", params.therapistId)
      .eq("review_status", "approved")
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 3);
    if (error) throw error;
    const rows = (data || []) as Array<{
      id: string;
      overall_rating: number | null;
      comment: string | null;
      created_at: string | null;
    }>;
    const mapped: TherapistReviewSnippet[] = rows.map((r) => ({
      id: r.id,
      rating: Number(r.overall_rating) || 0,
      comment: r.comment,
      created_at: r.created_at,
    }));
    return { data: mapped, error: null };
  } catch (e) {
    return { data: [], error: unknownToError(e) };
  }
}
