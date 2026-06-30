import { supabase } from "@/lib/supabase";

export type DsarRequestType = "access" | "erasure";

export async function submitDsarRequest(params: {
  userId: string;
  requestType: DsarRequestType;
  notes?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await supabase.from("dsar_requests").insert({
      user_id: params.userId,
      request_type: params.requestType,
      notes: params.notes?.trim() ? { message: params.notes.trim() } : {},
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to submit request",
    };
  }
}

export async function fetchLocationConsent(
  userId: string,
): Promise<{ consented: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("has_location_consent", {
      p_user_id: userId,
    });
    if (error) throw error;
    return { consented: data === true, error: null };
  } catch (e) {
    return {
      consented: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function withdrawLocationConsent(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await supabase.rpc("record_location_consent", {
      p_user_id: userId,
      p_consented: false,
      p_consent_method: "withdrawal",
      p_ip_address: null,
      p_user_agent: "theramate-ios-client",
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to withdraw consent",
    };
  }
}
