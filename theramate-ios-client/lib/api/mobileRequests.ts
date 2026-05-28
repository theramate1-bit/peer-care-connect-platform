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
  expires_at: string | null;
  session_id: string | null;
  guest_view_token: string | null;
};

type RpcRow = {
  id: string;
  practitioner_id: string;
  practitioner_name: string;
  product_id: string;
  product_name: string;
  service_type: string;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number;
  client_address: string | null;
  total_price_pence: number;
  payment_status: string | null;
  status: string | null;
  decline_reason: string | null;
  alternate_date: string | null;
  alternate_start_time: string | null;
  client_notes: string | null;
  created_at: string | null;
  expires_at: string | null;
  session_id: string | null;
  guest_view_token: string | null;
};

function mapRpcRow(row: RpcRow): ClientMobileRequest {
  return {
    id: row.id,
    practitioner_id: row.practitioner_id ?? null,
    practitioner_name: row.practitioner_name || "Practitioner",
    product_id: row.product_id ?? null,
    product_name: row.product_name || "Service",
    service_type: row.service_type,
    requested_date: row.requested_date,
    requested_start_time: row.requested_start_time,
    duration_minutes: row.duration_minutes,
    total_price_pence: row.total_price_pence,
    payment_status: row.payment_status,
    status: row.status,
    client_address: row.client_address,
    client_notes: row.client_notes,
    decline_reason: row.decline_reason,
    alternate_date: row.alternate_date,
    alternate_start_time: row.alternate_start_time,
    created_at: row.created_at,
    expires_at: row.expires_at,
    session_id: row.session_id,
    guest_view_token: row.guest_view_token,
  };
}

export async function fetchClientMobileRequests(
  clientId: string,
  status?: string | null,
): Promise<{
  data: ClientMobileRequest[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc("get_client_mobile_requests", {
      p_client_id: clientId,
      p_status: status ?? null,
    });
    if (error) throw error;
    return {
      data: ((data || []) as RpcRow[]).map(mapRpcRow),
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
