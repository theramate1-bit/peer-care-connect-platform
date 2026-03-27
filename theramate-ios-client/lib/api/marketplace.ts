/**
 * Marketplace practitioners — mirrors web `ClientBooking.loadPractitioners` (simplified).
 * Typed loosely: `users.user_role` in DB includes therapist variants not in generated types.
 */

import { supabase } from "@/lib/supabase";

export const THERAPIST_ROLES = [
  "sports_therapist",
  "osteopath",
  "massage_therapist",
] as const;

export type MarketplacePractitioner = {
  id: string;
  first_name: string;
  last_name: string;
  location: string | null;
  hourly_rate: number | null;
  specializations: string[] | null;
  therapist_type: string | null;
  average_rating: number;
  total_reviews: number;
  verified: boolean;
  /** Lowest active product price in major units (e.g. GBP), for display */
  from_price: number | null;
};

type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  location: string | null;
  hourly_rate: number | null;
  specializations: string[] | null;
  therapist_type: string | null;
  is_verified: boolean | null;
};

export async function fetchMarketplacePractitioners(): Promise<{
  data: MarketplacePractitioner[];
  error: Error | null;
}> {
  try {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, location, hourly_rate, specializations, therapist_type, is_verified",
      )
      // DB has therapist role values beyond generated `UserRole` type
      .in("user_role", [...THERAPIST_ROLES] as unknown as string[])
      .eq("is_active", true)
      .not("hourly_rate", "is", null);

    if (usersError) throw usersError;

    const users = (usersData || []) as UserRow[];
    const practitionerIds = users.map((p) => p.id);
    if (practitionerIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: productsData, error: productsError } = await supabase
      .from("practitioner_products")
      .select("practitioner_id, price_amount, is_active")
      .in("practitioner_id", practitionerIds)
      .eq("is_active", true);

    if (productsError) throw productsError;

    type ProductRow = { practitioner_id: string; price_amount: number | null };
    const productRows = (productsData || []) as ProductRow[];

    const minPriceByPractitioner = new Map<string, number>();
    for (const row of productRows) {
      const pid = row.practitioner_id;
      const pence = row.price_amount;
      if (pence == null) continue;
      const major = pence / 100;
      const prev = minPriceByPractitioner.get(pid);
      if (prev === undefined || major < prev)
        minPriceByPractitioner.set(pid, major);
    }

    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("therapist_id, rating")
      .in("therapist_id", practitionerIds);

    if (reviewsError) throw reviewsError;

    type ReviewRow = { therapist_id: string; rating: number | null };
    const reviewRows = (reviewsData || []) as ReviewRow[];

    const ratingsByTherapist = new Map<
      string,
      { sum: number; count: number }
    >();
    for (const r of reviewRows) {
      const tid = r.therapist_id;
      const rating = Number(r.rating);
      if (Number.isNaN(rating)) continue;
      const cur = ratingsByTherapist.get(tid) ?? { sum: 0, count: 0 };
      cur.sum += rating;
      cur.count += 1;
      ratingsByTherapist.set(tid, cur);
    }

    const result: MarketplacePractitioner[] = users.map((p) => {
      const agg = ratingsByTherapist.get(p.id);
      const average_rating =
        agg && agg.count > 0 ? Math.round((agg.sum / agg.count) * 10) / 10 : 0;
      const total_reviews = agg?.count ?? 0;
      const from_price =
        minPriceByPractitioner.get(p.id) ??
        (p.hourly_rate != null ? p.hourly_rate : null);

      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        location: p.location,
        hourly_rate: p.hourly_rate,
        specializations: p.specializations,
        therapist_type: p.therapist_type,
        average_rating,
        total_reviews,
        verified: p.is_verified === true,
        from_price,
      };
    });

    return { data: result, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}
