import { supabase } from "@/lib/supabase";

/**
 * Find-or-create guest `users` row for marketplace booking (parity with web
 * `ensure_guest_user_for_booking`).
 */
export async function ensureGuestUserForBooking(params: {
  email: string;
  name: string;
}): Promise<{ userId: string | null; error: Error | null }> {
  const email = params.email.trim();
  const name = params.name.trim();
  if (!email || !name) {
    return { userId: null, error: new Error("Name and email are required") };
  }
  try {
    const { data, error } = await supabase.rpc(
      "ensure_guest_user_for_booking",
      {
        p_email: email,
        p_name: name,
      },
    );
    if (error) throw error;
    if (!data) {
      return {
        userId: null,
        error: new Error("Could not create guest profile"),
      };
    }
    return { userId: String(data), error: null };
  } catch (e) {
    return {
      userId: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
