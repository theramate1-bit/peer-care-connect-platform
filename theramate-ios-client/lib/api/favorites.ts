/**
 * Client saved therapists (`favorites`: client_id + therapist_id).
 */

import { unknownToError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export type FavoriteRow = {
  id: string;
  client_id: string;
  therapist_id: string;
  created_at: string | null;
};

export async function fetchFavoriteTherapistIds(
  clientId: string,
): Promise<{ data: string[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("therapist_id")
      .eq("client_id", clientId);

    if (error) throw error;
    const ids = (data || []).map((r) => (r as { therapist_id: string }).therapist_id);
    return { data: ids, error: null };
  } catch (e) {
    return { data: [], error: unknownToError(e) };
  }
}

export async function addFavorite(
  clientId: string,
  therapistId: string,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from("favorites").insert({
      client_id: clientId,
      therapist_id: therapistId,
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        error.code === "23505" ||
        msg.includes("duplicate") ||
        msg.includes("unique")
      ) {
        return { error: null };
      }
      throw error;
    }
    return { error: null };
  } catch (e) {
    return { error: unknownToError(e) };
  }
}

export async function removeFavorite(
  clientId: string,
  therapistId: string,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("client_id", clientId)
      .eq("therapist_id", therapistId);
    if (error) throw error;
    return { error: null };
  } catch (e) {
    return { error: unknownToError(e) };
  }
}
