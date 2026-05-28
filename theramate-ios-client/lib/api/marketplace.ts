/**
 * Marketplace practitioners — mirrors web `ClientBooking.loadPractitioners` (simplified).
 * Typed loosely: `users.user_role` in DB includes therapist variants not in generated types.
 */

import { unknownToError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export const THERAPIST_ROLES = [
  "sports_therapist",
  "osteopath",
  "massage_therapist",
] as const;

export type MarketplaceProductSummary = {
  is_active: boolean;
  service_type: string | null;
};

export type MarketplacePractitioner = {
  id: string;
  first_name: string;
  last_name: string;
  location: string | null;
  hourly_rate: number | null;
  specializations: string[] | null;
  /** Discipline (sports_therapist, etc.) — aligned with web marketplace list. */
  user_role: string;
  therapist_type: string | null;
  mobile_service_radius_km: number | null;
  base_latitude: number | null;
  base_longitude: number | null;
  /** Active products — used with `booking-flow-type` for clinic vs mobile CTAs. */
  products: MarketplaceProductSummary[];
  bio: string | null;
  average_rating: number;
  total_reviews: number;
  verified: boolean;
  /** Public HTTPS URL from `users.profile_photo_url` (Supabase Storage). */
  profile_photo_url: string | null;
  /** Lowest active product price in major units (e.g. GBP), for display */
  from_price: number | null;
  /** Practitioner accepts pay-at-clinic (cash/terminal) bookings. */
  accept_in_person_payment: boolean;
  experience_years: number | null;
};

type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  location: string | null;
  hourly_rate: number | null;
  specializations: string[] | null;
  user_role: string;
  therapist_type: string | null;
  mobile_service_radius_km: number | null;
  base_latitude: number | null;
  base_longitude: number | null;
  bio: string | null;
  is_verified: boolean | null;
  profile_photo_url: string | null;
  accept_in_person_payment: boolean | null;
  experience_years: number | null;
};

export async function fetchMarketplacePractitioners(): Promise<{
  data: MarketplacePractitioner[];
  error: Error | null;
}> {
  try {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, location, hourly_rate, specializations, user_role, therapist_type, mobile_service_radius_km, base_latitude, base_longitude, bio, is_verified, profile_photo_url, accept_in_person_payment, experience_years",
      )
      // DB has therapist role values beyond generated `UserRole` type
      .in("user_role", [...THERAPIST_ROLES] as unknown as string[])
      .eq("is_active", true)
      // Match live RLS public practitioner profile policy (avoid surprising empty results).
      .eq("profile_completed", true)
      .eq("onboarding_status", "completed");

    if (usersError) throw usersError;

    // DB column `accept_in_person_payment` isn't in generated types yet; cast through unknown.
    const users = (usersData || []) as unknown as UserRow[];
    const practitionerIds = users.map((p) => p.id);
    if (practitionerIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: productsData, error: productsError } = await supabase
      .from("practitioner_products")
      .select("practitioner_id, price_amount, is_active, service_type")
      .in("practitioner_id", practitionerIds)
      .eq("is_active", true);

    if (productsError) throw productsError;

    type ProductRow = {
      practitioner_id: string;
      price_amount: number | null;
      is_active: boolean | null;
      service_type: string | null;
    };
    const productRows = (productsData || []) as ProductRow[];

    const minPriceByPractitioner = new Map<string, number>();
    const productsByPractitioner = new Map<
      string,
      MarketplaceProductSummary[]
    >();
    for (const row of productRows) {
      const pid = row.practitioner_id;
      const pence = row.price_amount;
      if (pence != null) {
        const major = pence / 100;
        const prev = minPriceByPractitioner.get(pid);
        if (prev === undefined || major < prev)
          minPriceByPractitioner.set(pid, major);
      }
      const list = productsByPractitioner.get(pid) ?? [];
      list.push({
        is_active: row.is_active !== false,
        service_type: row.service_type,
      });
      productsByPractitioner.set(pid, list);
    }

    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("therapist_id, overall_rating")
      .eq("review_status", "approved")
      .in("therapist_id", practitionerIds);

    if (reviewsError) throw reviewsError;

    type ReviewRow = { therapist_id: string; overall_rating: number | null };
    const reviewRows = (reviewsData || []) as ReviewRow[];

    const ratingsByTherapist = new Map<
      string,
      { sum: number; count: number }
    >();
    for (const r of reviewRows) {
      const tid = r.therapist_id;
      const rating = Number(r.overall_rating);
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
        user_role: p.user_role,
        therapist_type: p.therapist_type,
        mobile_service_radius_km: p.mobile_service_radius_km,
        base_latitude: p.base_latitude,
        base_longitude: p.base_longitude,
        products: productsByPractitioner.get(p.id) ?? [],
        bio: p.bio?.trim() || null,
        average_rating,
        total_reviews,
        verified: p.is_verified === true,
        profile_photo_url: p.profile_photo_url?.trim() || null,
        from_price,
        accept_in_person_payment: p.accept_in_person_payment === true,
        experience_years: p.experience_years ?? null,
      };
    });

    return { data: result, error: null };
  } catch (e) {
    return { data: [], error: unknownToError(e) };
  }
}
