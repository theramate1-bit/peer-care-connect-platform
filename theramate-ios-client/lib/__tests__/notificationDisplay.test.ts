import { describe, expect, it } from "@jest/globals";

import type { AppNotification } from "@/lib/api/notifications";
import {
  formatNotificationForInbox,
  isPendingExchangeNotification,
} from "@/lib/notificationDisplay";

function n(partial: Partial<AppNotification>): AppNotification {
  return {
    id: "1",
    user_id: "u1",
    type: "exchange_request_received",
    title: "New treatment exchange request",
    message: "Ray requested a treatment exchange for 2026-05-21 at 09:00",
    data: {},
    is_read: false,
    created_at: null,
    source_type: "treatment_exchange_request",
    source_id: "req-1",
    related_entity_id: null,
    related_entity_type: null,
    ...partial,
  };
}

describe("notificationDisplay", () => {
  it("marks pending exchange types", () => {
    expect(isPendingExchangeNotification(n({}))).toBe(true);
    expect(
      isPendingExchangeNotification(
        n({ type: "exchange_session_confirmed", source_type: null }),
      ),
    ).toBe(false);
  });

  it("shows Treatment exchange badge", () => {
    const d = formatNotificationForInbox(n({}));
    expect(d.badge).toBe("Treatment exchange");
  });

  it("strips false Confirmed from pending exchange message", () => {
    const d = formatNotificationForInbox(
      n({ message: "16 Mar · 09:00 · Confirmed" }),
    );
    expect(d.message).not.toMatch(/confirmed/i);
  });

  it("replaces Client with peer name when payload has requester", () => {
    const d = formatNotificationForInbox(
      n({
        message: "Client Clinic · Mon 09:00",
        data: { requester_name: "Sam Patel" },
      }),
    );
    expect(d.message).toContain("Sam Patel");
    expect(d.message).not.toContain("Client");
  });
});
