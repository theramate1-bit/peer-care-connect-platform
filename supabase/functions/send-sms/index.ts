import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers - restrict to allowed origins in production (mirrors send-email)
const getAllowedOrigin = (): string => {
  const origin = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedOrigins = origin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    return allowedOrigins[0];
  }

  return Deno.env.get("ENVIRONMENT") === "production" ? "" : "*";
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = origin || "*";

  const corsOrigin =
    allowedOrigin === "*" || Deno.env.get("ENVIRONMENT") !== "production"
      ? "*"
      : allowedOrigin.includes(requestOrigin)
        ? requestOrigin
        : "";

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const isE164 = (value: string): boolean =>
  /^\+[1-9]\d{1,14}$/.test(value.trim());

interface SendSmsRequest {
  to: string;
  text: string;
  from?: string;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const headers = {
    ...corsHeaders(origin),
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    const infoBipApiKey = Deno.env.get("INFOBIP_API_KEY");
    const infoBipBaseUrl = Deno.env.get("INFOBIP_BASE_URL");
    const defaultFrom = Deno.env.get("INFOBIP_SMS_FROM");

    if (!infoBipApiKey || !infoBipBaseUrl) {
      return new Response(
        JSON.stringify({
          error:
            "Infobip is not configured. Please add INFOBIP_API_KEY and INFOBIP_BASE_URL to Edge Function secrets.",
        }),
        { status: 500, headers },
      );
    }

    const body: Partial<SendSmsRequest> = await req.json().catch(() => ({}));
    const to = (body.to || "").trim();
    const text = (body.text || "").trim();
    const from = (body.from || defaultFrom || "").trim();

    if (!to || !text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, text" }),
        { status: 400, headers },
      );
    }

    if (!isE164(to)) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid "to" number. Expected E.164 format like +447700900123.',
        }),
        { status: 400, headers },
      );
    }

    if (!from) {
      return new Response(
        JSON.stringify({
          error:
            "Missing sender. Provide `from` in request or set INFOBIP_SMS_FROM secret.",
        }),
        { status: 400, headers },
      );
    }

    if (text.length > 1600) {
      return new Response(
        JSON.stringify({
          error: "Message too long. Limit is 1600 characters.",
        }),
        { status: 400, headers },
      );
    }

    const url = `${infoBipBaseUrl.replace(/\/+$/, "")}/sms/2/text/advanced`;

    const infobipRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `App ${infoBipApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            from,
            destinations: [{ to }],
            text,
          },
        ],
      }),
    });

    const raw = await infobipRes.text();
    const payload = raw ? JSON.parse(raw) : null;

    if (!infobipRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Infobip send failed",
          status: infobipRes.status,
          details: payload,
        }),
        { status: 502, headers },
      );
    }

    const messageId =
      payload?.messages?.[0]?.messageId ||
      payload?.messages?.[0]?.message_id ||
      null;

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        infobip: payload,
      }),
      { status: 200, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers },
    );
  }
});
