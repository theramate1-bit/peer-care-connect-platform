import {
  normalizeNotification,
  parseNotificationRows,
  cleanNotificationMessage,
  resolveNotificationDestination,
  type Notification,
} from "@/lib/notification-utils";

describe("notification-utils", () => {
  describe("normalizeNotification", () => {
    it("normalizes basic notification", () => {
      const input: Notification = {
        id: "n1",
        type: "booking_confirmed",
        title: "Booking Confirmed",
        message: "Your session is confirmed",
      };
      const out = normalizeNotification(input);
      expect(out.id).toBe("n1");
      expect(out.type).toBe("booking_confirmed");
      expect(out.family).toBe("booking");
      expect(out.title).toBe("Booking Confirmed");
      expect(out.message).toBe("Your session is confirmed");
    });

    it("defaults title to Notification when missing", () => {
      const out = normalizeNotification({
        id: "n2",
        type: "unknown",
        title: "",
      });
      expect(out.title).toBe("Notification");
    });

    it("parses payload from string JSON", () => {
      const input: Notification = {
        id: "n3",
        type: "message",
        title: "New Message",
        payload: JSON.stringify({ conversation_id: "conv-1" }),
      };
      const out = normalizeNotification(input);
      expect(out.data.conversation_id).toBe("conv-1");
    });

    it("sets read from read_at", () => {
      const out = normalizeNotification({
        id: "n4",
        type: "booking_confirmed",
        title: "T",
        read_at: "2025-01-01T00:00:00Z",
      });
      expect(out.read).toBe(true);
    });
  });

  describe("parseNotificationRows", () => {
    it("filters out dismissed notifications", () => {
      const rows: Notification[] = [
        { id: "a", type: "x", title: "A", dismissed_at: "2025-01-01" },
        { id: "b", type: "x", title: "B" },
      ];
      const out = parseNotificationRows(rows);
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe("b");
    });

    it("sorts unread first, then by created_at desc", () => {
      const rows: Notification[] = [
        { id: "a", type: "x", title: "A", read: true, created_at: "2025-01-02" },
        { id: "b", type: "x", title: "B", read: false, created_at: "2025-01-01" },
      ];
      const out = parseNotificationRows(rows);
      expect(out[0].id).toBe("b");
    });
  });

  describe("cleanNotificationMessage", () => {
    it("replaces undefined with practitioner name when in data", () => {
      const n = normalizeNotification({
        id: "n",
        type: "booking_confirmed",
        title: "T",
        message: "Session confirmed with undefined",
        payload: { practitionerName: "Dr Smith" },
      });
      expect(cleanNotificationMessage(n)).toBe("Session confirmed with Dr Smith");
    });

    it("removes seconds from time in message", () => {
      const n = normalizeNotification({
        id: "n",
        type: "x",
        title: "T",
        message: "Session at 14:30:00",
      });
      expect(cleanNotificationMessage(n)).toBe("Session at 14:30");
    });
  });

  describe("resolveNotificationDestination", () => {
    it("returns messages url for message family", () => {
      const n = normalizeNotification({
        id: "n",
        type: "new_message",
        title: "New Message",
        payload: { conversation_id: "c1" },
      });
      const dest = resolveNotificationDestination(n, "client");
      expect(dest.targetUrl).toContain("/messages");
      expect(dest.targetUrl).toContain("conversation=c1");
    });

    it("returns client sessions for booking when client", () => {
      const n = normalizeNotification({
        id: "n",
        type: "booking_confirmed",
        title: "Booking",
        payload: { session_id: "s1" },
      });
      const dest = resolveNotificationDestination(n, "client");
      expect(dest.targetUrl).toContain("/client/sessions");
      expect(dest.targetUrl).toContain("sessionId=s1");
    });

    it("returns practice schedule for booking when practitioner", () => {
      const n = normalizeNotification({
        id: "n",
        type: "booking_confirmed",
        title: "Booking",
        payload: { session_id: "s1" },
      });
      const dest = resolveNotificationDestination(n, "sports_therapist");
      expect(dest.targetUrl).toContain("/practice/sessions");
    });

    it("returns exchange requests for exchange family", () => {
      const n = normalizeNotification({
        id: "n",
        type: "treatment_exchange_request",
        title: "Exchange Request",
        source_type: "treatment_exchange_request",
        source_id: "req1",
      });
      const dest = resolveNotificationDestination(n, "sports_therapist");
      expect(dest.targetUrl).toContain("/practice/exchange-requests");
    });

    it("returns dashboard for unknown notification type", () => {
      const n = normalizeNotification({ id: "n", type: "unknown", title: "T" });
      const dest = resolveNotificationDestination(n, "client");
      expect(dest.targetUrl).toBeDefined();
    });
  });

  describe("normalizeNotification family mapping", () => {
    it("maps booking types to booking family", () => {
      expect(normalizeNotification({ id: "1", type: "booking_confirmed", title: "T" }).family).toBe("booking");
    });
  });

  describe("cleanNotificationMessage edge cases", () => {
    it("handles empty message", () => {
      const n = normalizeNotification({ id: "n", type: "x", title: "T", message: "" });
      expect(cleanNotificationMessage(n)).toBe("");
    });
  });
});
