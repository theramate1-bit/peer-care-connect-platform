/**
 * Admin practitioner verification queue (`users.is_verified`).
 */

import { THERAPIST_ROLES } from "@/lib/marketplacePractitioners";
import { supabase } from "@/integrations/supabase/client";

export type PendingPractitioner = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  user_role: string | null;
  location: string | null;
  bio: string | null;
  is_verified: boolean | null;
  created_at: string | null;
};

export async function fetchPendingPractitionerVerifications(): Promise<{
  data: PendingPractitioner[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, email, user_role, location, bio, is_verified, created_at",
      )
      .in("user_role", [...THERAPIST_ROLES])
      .or("is_verified.eq.false,is_verified.is.null")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: (data ?? []) as PendingPractitioner[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function setPractitionerVerified(
  userId: string,
  verified: boolean,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("users")
      .update({ is_verified: verified })
      .eq("id", userId);
    if (error) throw error;
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
