export interface StripeMeterResult {
  meterEventId: string;
}

export function isSmsMeteringEnabled() {
  return (Deno.env.get("SMS_METERED_ENABLED") || "false").toLowerCase() === "true";
}

export async function postStripeSmsMeterEvent(
  stripeCustomerId: string,
  smsLogId: string,
): Promise<StripeMeterResult> {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const meterEventName = Deno.env.get("STRIPE_SMS_METER_EVENT_NAME") || "theramate_sms_outbound";

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  const body = new URLSearchParams();
  body.set("event_name", meterEventName);
  body.set("identifier", smsLogId);
  body.set("payload[stripe_customer_id]", stripeCustomerId);
  body.set("payload[value]", "1");

  const response = await fetch("https://api.stripe.com/v1/billing/meter_events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "Failed to post Stripe meter event");
  }

  return {
    meterEventId: (json?.id as string | undefined) || smsLogId,
  };
}
