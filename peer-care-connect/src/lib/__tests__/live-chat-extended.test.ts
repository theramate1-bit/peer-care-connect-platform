/**
 * Extended tests for live chat config
 */
import { LIVE_CHAT_CONFIG, shouldShowLiveChat } from "@/lib/live-chat-config";

describe("live-chat extended", () => {
  describe("LIVE_CHAT_CONFIG", () => {
    it("has WIDGET_ID and CUSTOMIZATION", () => {
      expect(LIVE_CHAT_CONFIG).toHaveProperty("WIDGET_ID");
      expect(LIVE_CHAT_CONFIG).toHaveProperty("CUSTOMIZATION");
      expect(typeof LIVE_CHAT_CONFIG.CUSTOMIZATION.enabled).toBe("boolean");
    });
  });

  describe("shouldShowLiveChat", () => {
    it("returns boolean", () => {
      const result = shouldShowLiveChat();
      expect(typeof result).toBe("boolean");
    });
  });
});
