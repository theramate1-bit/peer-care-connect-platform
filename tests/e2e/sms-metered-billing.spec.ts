import { test, expect } from "@playwright/test";

test.describe("SMS metered billing", () => {
  test("pricing page shows usage-based SMS and commission copy", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Email reminders")).toBeVisible();
    await expect(page.getByText(/SMS reminders/i)).toBeVisible();
    await expect(page.getByText(/6p \/ text, billed monthly/i)).toBeVisible();
    await expect(page.getByText(/1\.95%\s*\+\s*20p/)).toBeVisible();
    await expect(page.getByText(/TheraMate commission on each paid session/i)).toBeVisible();
  });

  test("subscribe + send sms + invoice preview flow", async ({ request }) => {
    test.skip(
      !process.env.E2E_SMS_BILLING_ENABLED,
      "Set E2E_SMS_BILLING_ENABLED=1 with seeded Stripe/Supabase test data",
    );

    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    const token = process.env.E2E_SUPABASE_BEARER_TOKEN;
    const sendSmsPath = process.env.E2E_SEND_SMS_PATH || "/functions/v1/send-sms";
    const invoicePreviewPath = process.env.E2E_SMS_INVOICE_PREVIEW_PATH || "/functions/v1/debug-sms-invoice-preview";

    test.skip(!token, "Missing E2E_SUPABASE_BEARER_TOKEN");

    const sendResponse = await request.post(`${baseUrl}${sendSmsPath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        to: process.env.E2E_SMS_TARGET_NUMBER || "+447000000000",
        message: "TheraMate E2E SMS billing test",
      },
    });

    expect(sendResponse.ok()).toBeTruthy();
    const sendJson = await sendResponse.json();
    expect(sendJson.success).toBeTruthy();
    expect(sendJson.smsLogId).toBeTruthy();

    const invoicePreviewResponse = await request.post(`${baseUrl}${invoicePreviewPath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { smsLogId: sendJson.smsLogId },
    });

    expect(invoicePreviewResponse.ok()).toBeTruthy();
  });
});
