const fetch =
  globalThis.fetch ||
  ((...args) => import("node-fetch").then(({ default: f }) => f(...args)));

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODU3OTkwMCwiZXhwIjoyMDQ0MTU1OTAwfQ.cd0RLjwYqV-ED_c0h0h5YBEv7DJuYjBEkO5zOBYkLZQ";

const commonSession = {
  sessionId: `test-${Date.now()}`,
  sessionType: "Test Massage Session",
  sessionDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
  sessionTime: "14:00",
  sessionDuration: 60,
  sessionPrice: 85,
  sessionLocation: "Theramate HQ",
  practitionerName: "Automation Practitioner",
  clientName: "Automation Client",
  bookingUrl: "https://theramate.co.uk/bookings",
  messageUrl: "https://theramate.co.uk/messages",
  directionsUrl: "https://theramate.co.uk/directions",
};

const tests = [
  {
    name: "booking_confirmation_client",
    payload: {
      emailType: "booking_confirmation_client",
      recipientEmail: "delivered@resend.dev",
      recipientName: "Automation Client",
      data: commonSession,
    },
  },
  {
    name: "booking_confirmation_practitioner",
    payload: {
      emailType: "booking_confirmation_practitioner",
      recipientEmail: "delivered@resend.dev",
      recipientName: "Automation Practitioner",
      data: {
        ...commonSession,
        clientEmail: "guest@example.com",
        paymentStatus: "completed",
      },
    },
  },
  {
    name: "payment_confirmation_client",
    payload: {
      emailType: "payment_confirmation_client",
      recipientEmail: "delivered@resend.dev",
      recipientName: "Automation Client",
      data: {
        ...commonSession,
        paymentAmount: 85,
        paymentId: `pay-${Date.now()}`,
      },
    },
  },
  {
    name: "payment_received_practitioner",
    payload: {
      emailType: "payment_received_practitioner",
      recipientEmail: "delivered@resend.dev",
      recipientName: "Automation Practitioner",
      data: {
        paymentAmount: 85,
        platformFee: 0.425,
        practitionerAmount: 84.575,
        clientName: "Automation Client",
        sessionType: commonSession.sessionType,
        sessionDate: commonSession.sessionDate,
        paymentId: `pay-${Date.now()}`,
      },
    },
  },
  {
    name: "session_reminder_24h",
    payload: {
      emailType: "session_reminder_24h",
      recipientEmail: "delivered@resend.dev",
      recipientName: "Automation Client",
      data: commonSession,
    },
  },
  {
    name: "cancellation",
    payload: {
      emailType: "cancellation",
      recipientEmail: "delivered@resend.dev",
      recipientName: "Automation Client",
      data: {
        ...commonSession,
        cancellationReason: "Automated test cancellation",
        refundAmount: 85,
      },
    },
  },
];

async function run() {
  for (const test of tests) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(test.payload),
    });

    const result = await response.json().catch(() => ({}));
    console.log(`\n=== ${test.name} ===`);
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(result, null, 2));

    if (!response.ok) {
      throw new Error(`Failed test ${test.name}`);
    }
  }

  console.log("\n✅ Email flow tests completed");
}

run().catch((err) => {
  console.error("❌ Email flow tests failed:", err.message);
  process.exit(1);
});
