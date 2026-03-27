import { supabase } from "@/lib/supabase";

export type ClientMobileRequest = {
  id: string;
  practitioner_id: string | null;
  practitioner_name: string;
  product_id: string | null;
  product_name: string;
  service_type: string;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number;
  total_price_pence: number;
  payment_status: string | null;
  status: string | null;
  client_address: string | null;
  client_notes: string | null;
  decline_reason: string | null;
  alternate_date: string | null;
  alternate_start_time: string | null;
  created_at: string | null;
  session_id: string | null;
};

type MobileRequestRow = {
  id: string;
  practitioner_id: string | null;
  product_id: string | null;
  service_type: string;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number;
  total_price_pence: number;
  payment_status: string | null;
  status: string | null;
  client_address: string | null;
  client_notes: string | null;
  decline_reason: string | null;
  alternate_date: string | null;
  alternate_start_time: string | null;
  created_at: string | null;
  session_id: string | null;
};

function toClientItem(
  row: MobileRequestRow,
  practitionerNames: Map<string, string>,
  productNames: Map<string, string>,
): ClientMobileRequest {
  return {
    ...row,
    practitioner_name: row.practitioner_id
      ? practitionerNames.get(row.practitioner_id) || "Practitioner"
      : "Practitioner",
    product_name: row.product_id
      ? productNames.get(row.product_id) || "Service"
      : "Service",
  };
}

export async function fetchClientMobileRequests(clientId: string): Promise<{
  data: ClientMobileRequest[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("mobile_booking_requests")
      .select(
        "id, practitioner_id, product_id, service_type, requested_date, requested_start_time, duration_minutes, total_price_pence, payment_status, status, client_address, client_notes, decline_reason, alternate_date, alternate_start_time, created_at, session_id",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as MobileRequestRow[];
    if (rows.length === 0) return { data: [], error: null };

    const practitionerIds = [
      ...new Set(rows.map((r) => r.practitioner_id).filter(Boolean)),
    ] as string[];
    const productIds = [
      ...new Set(rows.map((r) => r.product_id).filter(Boolean)),
    ] as string[];

    const practitionerNames = new Map<string, string>();
    if (practitionerIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", practitionerIds);
      if (uErr) throw uErr;
      for (const u of (users || []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
      }>) {
        practitionerNames.set(
          u.id,
          `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Practitioner",
        );
      }
    }

    const productNames = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: products, error: pErr } = await supabase
        .from("practitioner_products")
        .select("id, name")
        .in("id", productIds);
      if (pErr) throw pErr;
      for (const p of (products || []) as Array<{ id: string; name: string }>) {
        productNames.set(p.id, p.name || "Service");
      }
    }

    return {
      data: rows.map((r) => toClientItem(r, practitionerNames, productNames)),
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export async function fetchClientMobileRequestById(params: {
  clientId: string;
  requestId: string;
}): Promise<{ data: ClientMobileRequest | null; error: Error | null }> {
  const list = await fetchClientMobileRequests(params.clientId);
  if (list.error) return { data: null, error: list.error };
  return {
    data: list.data.find((x) => x.id === params.requestId) || null,
    error: null,
  };
}
