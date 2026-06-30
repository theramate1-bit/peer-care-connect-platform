/**
 * Guest session lookup — keep aligned with `src/lib/guestBooking.ts`.
 */

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

export type GuestBookingLookupRow = {
  session_id: string;
  session_date: string;
  start_time: string;
  session_type: string | null;
  practitioner_name: string | null;
  status: string | null;
  guest_view_token: string | null;
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

/** `/book/:slug` — `booking_slug` first, then legacy UUID `id`. */
export async function fetchPublicTherapistBySlugOrId(
  slugOrId: string,
): Promise<{
  data: PublicTherapist | null;
  error: Error | null;
}> {
  const trimmed = slugOrId.trim();
  if (!trimmed) {
    return { data: null, error: new Error("Missing booking identifier") };
  }
  const selectCols =
    "id, first_name, last_name, location, bio, therapist_type, specializations, hourly_rate, is_verified";
  try {
    if (!UUID_RE.test(trimmed)) {
      const { data, error } = await supabase
        .from("users")
        .select(selectCols)
        .eq("booking_slug", trimmed)
        .maybeSingle();
      if (error) {
        const msg = (error as { message?: string }).message || "";
        if (!/column .* does not exist/i.test(msg)) {
          throw error;
        }
      }
      if (data) {
        return { data: data as PublicTherapist, error: null };
      }
    }
    const { data, error } = await supabase
      .from("users")
      .select(selectCols)
      .eq("id", trimmed)
      .maybeSingle();
    if (error) throw error;
    return { data: (data as PublicTherapist | null) ?? null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function findBookingsByEmail(email: string): Promise<{
  data: GuestBookingLookupRow[];
  error: Error | null;
}> {
  const normalized = email.trim();
  if (!normalized) {
    return { data: [], error: new Error("Email is required") };
  }
  try {
    const { data, error } = await supabase.rpc("get_guest_sessions_by_email", {
      p_email: normalized,
    });
    if (error) throw error;
    return {
      data: (data || []) as GuestBookingLookupRow[],
      error: null,
    };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
  }
}
