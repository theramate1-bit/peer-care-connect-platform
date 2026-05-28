import { supabase } from "@/lib/supabase";

export type GuestMobileRequestRow = {
  id: string;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number;
  total_price_pence: number;
  status: string | null;
  payment_status: string | null;
  client_address: string | null;
  created_at: string | null;
  expires_at: string | null;
  session_id: string | null;
  guest_view_token: string | null;
};

export async function fetchGuestMobileRequestsByEmail(email: string): Promise<{
  data: GuestMobileRequestRow[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc(
      "get_guest_mobile_requests_by_email",
      {
        p_email: email.trim().toLowerCase(),
        p_status: null,
      },
    );
    if (error) throw error;
    const rows = (data || []) as GuestMobileRequestRow[];
    return { data: rows, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function fetchGuestMobileRequestSessionLink(params: {
  requestId: string;
  email: string;
}): Promise<{
  sessionId: string | null;
  guestViewToken: string | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc(
      "get_guest_mobile_request_session_link",
      {
        p_request_id: params.requestId,
        p_email: params.email.trim().toLowerCase(),
      },
    );
    if (error) throw error;
    const payload = (data || {}) as {
      success?: boolean;
      session_id?: string;
      guest_view_token?: string | null;
      error?: string;
    };
    if (!payload.success) {
      return {
        sessionId: null,
        guestViewToken: null,
        error: new Error(payload.error || "Could not load session link."),
      };
    }
    return {
      sessionId: payload.session_id ?? null,
      guestViewToken: payload.guest_view_token ?? null,
      error: null,
    };
  } catch (e) {
    return {
      sessionId: null,
      guestViewToken: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
