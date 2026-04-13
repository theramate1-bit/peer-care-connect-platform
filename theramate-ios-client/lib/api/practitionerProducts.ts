/**
 * Practitioner products — marketplace listing (extends booking product reads).
 * Create/update/delete go through Edge Function `stripe-payment` (Stripe Connect).
 */

import { supabase } from "@/lib/supabase";

export type PractitionerProductRow = {
  id: string;
  practitioner_id: string;
  name: string;
  description: string | null;
  service_type: string | null;
  price_amount: number | null;
  duration_minutes: number | null;
  is_active: boolean | null;
  currency: string | null;
};

export async function fetchPractitionerProducts(
  practitionerId: string,
): Promise<{ data: PractitionerProductRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("practitioner_products")
      .select(
        "id, practitioner_id, name, description, service_type, price_amount, duration_minutes, is_active, currency",
      )
      .eq("practitioner_id", practitionerId)
      .order("name");
    if (error) throw error;
    return { data: (data || []) as PractitionerProductRow[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function setPractitionerProductActive(params: {
  productId: string;
  practitionerId: string;
  isActive: boolean;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("practitioner_products")
      .update({ is_active: params.isActive })
      .eq("id", params.productId)
      .eq("practitioner_id", params.practitionerId);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

const ALLOWED_DURATIONS = [30, 45, 60, 75, 90] as const;
export const PRACTITIONER_PRODUCT_DURATIONS = ALLOWED_DURATIONS;

type StripeProductPayload = {
  product?: PractitionerProductRow & Record<string, unknown>;
  error?: string;
  requires_connect?: boolean;
  details?: string;
};

function parseInvokePayload(raw: unknown): StripeProductPayload {
  if (raw && typeof raw === "object") return raw as StripeProductPayload;
  return {};
}

/** Create product on Stripe Connect + DB (pence, duration from allowed list). */
export async function createPractitionerProductStripe(params: {
  practitionerId: string;
  name: string;
  description?: string | null;
  /** GBP amount in pence (e.g. 5000 = £50.00). */
  priceAmountPence: number;
  durationMinutes: (typeof ALLOWED_DURATIONS)[number];
  category?: string;
  serviceCategory?: string | null;
  serviceType?: "clinic" | "mobile" | "both";
}): Promise<{ product: PractitionerProductRow | null; error: Error | null }> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "stripe-payment",
      {
        body: {
          action: "create-product",
          practitioner_id: params.practitionerId,
          name: params.name.trim(),
          description: params.description?.trim() ?? null,
          price_amount: params.priceAmountPence,
          duration_minutes: params.durationMinutes,
          category: params.category ?? "general",
          service_category: params.serviceCategory ?? null,
          service_type: params.serviceType ?? "clinic",
        },
      },
    );
    if (fnErr) {
      return { product: null, error: new Error(fnErr.message) };
    }
    const payload = parseInvokePayload(data);
    if (payload.error) {
      const msg =
        payload.details || payload.error || "Could not create product";
      return { product: null, error: new Error(msg) };
    }
    const p = payload.product;
    if (!p?.id) {
      return { product: null, error: new Error("Invalid response from server") };
    }
    return {
      product: {
        id: p.id,
        practitioner_id: String(p.practitioner_id ?? params.practitionerId),
        name: String(p.name ?? ""),
        description: (p.description as string | null) ?? null,
        service_type: (p.service_type as string | null) ?? null,
        price_amount:
          typeof p.price_amount === "number"
            ? p.price_amount
            : Number(p.price_amount ?? 0),
        duration_minutes:
          typeof p.duration_minutes === "number"
            ? p.duration_minutes
            : Number(p.duration_minutes ?? 0),
        is_active: p.is_active === true || p.is_active === null,
        currency: (p.currency as string | null) ?? "gbp",
      },
      error: null,
    };
  } catch (e) {
    return {
      product: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function updatePractitionerProductStripe(params: {
  productId: string;
  patch: Partial<{
    name: string;
    description: string | null;
    price_amount: number;
    currency: string;
    duration_minutes: number;
    service_category: string | null;
    service_type: "clinic" | "mobile" | "both";
    category: string;
    is_active: boolean;
  }>;
}): Promise<{ product: PractitionerProductRow | null; error: Error | null }> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "stripe-payment",
      {
        body: {
          action: "update-product",
          product_id: params.productId,
          ...params.patch,
        },
      },
    );
    if (fnErr) {
      return { product: null, error: new Error(fnErr.message) };
    }
    const payload = parseInvokePayload(data);
    if (payload.error) {
      const msg =
        payload.details || payload.error || "Could not update product";
      return { product: null, error: new Error(msg) };
    }
    const p = payload.product;
    if (!p?.id) {
      return { product: null, error: new Error("Invalid response from server") };
    }
    return {
      product: {
        id: p.id,
        practitioner_id: String(p.practitioner_id ?? ""),
        name: String(p.name ?? ""),
        description: (p.description as string | null) ?? null,
        service_type: (p.service_type as string | null) ?? null,
        price_amount:
          typeof p.price_amount === "number"
            ? p.price_amount
            : Number(p.price_amount ?? 0),
        duration_minutes:
          typeof p.duration_minutes === "number"
            ? p.duration_minutes
            : Number(p.duration_minutes ?? 0),
        is_active: p.is_active === true || p.is_active === null,
        currency: (p.currency as string | null) ?? "gbp",
      },
      error: null,
    };
  } catch (e) {
    return {
      product: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function deletePractitionerProductStripe(params: {
  productId: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "stripe-payment",
      {
        body: {
          action: "delete-product",
          product_id: params.productId,
        },
      },
    );
    if (fnErr) {
      return { ok: false, error: new Error(fnErr.message) };
    }
    const payload = data as { success?: boolean; error?: string };
    if (payload?.error) {
      return { ok: false, error: new Error(payload.error) };
    }
    if (payload?.success !== true) {
      return { ok: false, error: new Error("Could not delete product") };
    }
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
