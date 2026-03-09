export interface GatewayPolicyResponse {
  ok: boolean;
  redirect_hint?: string;
  reason?: string;
  practitionerAccess?: boolean;
}

import { supabase } from '@/integrations/supabase/client';

const GATEWAY_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-gateway`;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

export async function checkGatewayPolicy(): Promise<GatewayPolicyResponse> {
  const res = await fetch(`${GATEWAY_FUNCTION_URL}/policy`, {
    method: 'GET',
    credentials: 'include',
    headers: await authHeaders(),
  });

  if (res.status === 200) return { ok: true };
  if (res.status === 401) return { ok: false, redirect_hint: '/login', reason: 'unauthenticated' };
  if (res.status === 451) return { ok: false, redirect_hint: '/onboarding', reason: 'onboarding_incomplete' };
  if (res.status === 403) return { ok: false, redirect_hint: '/pricing', reason: 'subscription_required' };
  return { ok: false, reason: `gateway_${res.status}` };
}

export async function fetchWithGateway<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const policy = await checkGatewayPolicy();
  if (!policy.ok) {
    const error: any = new Error('Access denied by policy');
    error.redirect_hint = policy.redirect_hint;
    error.reason = policy.reason;
    throw error;
  }

  const res = await fetch(input, {
    ...(init || {}),
    credentials: 'include',
    headers: {
      ...(init?.headers as any),
      ...(await authHeaders()),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}


