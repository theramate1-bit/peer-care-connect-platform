/**
 * Resolve `therapist_profiles.id` for marketplace / legacy `projects` tables.
 */

import { supabase } from "@/lib/supabase";

export async function fetchTherapistProfileRowByUserId(userId: string): Promise<{
  data: { id: string } | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return { data: data as { id: string } | null, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
