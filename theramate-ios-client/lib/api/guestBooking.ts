import { supabase } from "@/lib/supabase";

export type GuestSessionView = {
  id: string;
  therapist_id: string | null;
  client_name: string | null;
  client_email: string | null;
  session_date: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  session_type: string | null;
  appointment_type: string | null;
  visit_address: string | null;
  clinic_address: string | null;
  status: string | null;
  payment_status: string | null;
  price: number | null;
};

export type PublicTherapist = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  location: string | null;
  bio: string | null;
  therapist_type: string | null;
  specializations: string[] | null;
  hourly_rate: number | null;
  is_verified: boolean | null;
};

export async function fetchGuestSessionByToken(params: {
  sessionId: string;
  token: string;
}): Promise<{
  data: GuestSessionView | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc("get_session_by_guest_token", {
      p_session_id: params.sessionId,
      p_token: params.token,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { data: (row as GuestSessionView | null) ?? null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function findBookingsByEmail(email: string): Promise<{
  data: Array<{
    id: string;
    session_date: string;
    start_time: string;
    status: string | null;
    therapist_id: string | null;
    client_email: string | null;
  }>;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("client_sessions")
      .select(
        "id, session_date, start_time, status, therapist_id, client_email",
      )
      .eq("client_email", email.trim().toLowerCase())
      .order("session_date", { ascending: false })
      .limit(20);
    if (error) throw error;
    return {
      data: (data || []) as Array<{
        id: string;
        session_date: string;
        start_time: string;
        status: string | null;
        therapist_id: string | null;
        client_email: string | null;
      }>,
      error: null,
    };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function fetchPublicTherapistById(id: string): Promise<{
  data: PublicTherapist | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, location, bio, therapist_type, specializations, hourly_rate, is_verified",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return { data: (data as PublicTherapist | null) ?? null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
