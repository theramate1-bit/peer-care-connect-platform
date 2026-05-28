import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isSmsMeteringEnabled, postStripeSmsMeterEvent } from "./sms-metering.ts";

Deno.test("isSmsMeteringEnabled reads feature flag", () => {
  Deno.env.set("SMS_METERED_ENABLED", "true");
  assertEquals(isSmsMeteringEnabled(), true);
  Deno.env.set("SMS_METERED_ENABLED", "false");
  assertEquals(isSmsMeteringEnabled(), false);
});

Deno.test("postStripeSmsMeterEvent throws when secret key missing", async () => {
  Deno.env.delete("STRIPE_SECRET_KEY");
  await assertRejects(
    () => postStripeSmsMeterEvent("cus_test", "sms_log_1"),
    Error,
    "STRIPE_SECRET_KEY is missing",
  );
});

Deno.test("postStripeSmsMeterEvent sends identifier and returns event id", async () => {
  Deno.env.set("STRIPE_SECRET_KEY", "sk_test_123");
  Deno.env.set("STRIPE_SMS_METER_EVENT_NAME", "theramate_sms_outbound");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const bodyString = String(init?.body || "");
    if (!bodyString.includes("identifier=sms_log_2")) {
      throw new Error("identifier not sent");
    }

    return new Response(JSON.stringify({ id: "mev_test_1" }), { status: 200 });
  };

  try {
    const result = await postStripeSmsMeterEvent("cus_test", "sms_log_2");
    assertEquals(result.meterEventId, "mev_test_1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("postStripeSmsMeterEvent throws on Stripe error", async () => {
  Deno.env.set("STRIPE_SECRET_KEY", "sk_test_123");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "duplicate identifier" } }), { status: 400 });

  try {
    await assertRejects(
      () => postStripeSmsMeterEvent("cus_test", "sms_log_3"),
      Error,
      "duplicate identifier",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
