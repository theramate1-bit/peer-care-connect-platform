import { LIVE_CHAT_CONFIG, shouldShowLiveChat } from "@/lib/live-chat-config";

describe("live-chat-config", () => {
  describe("LIVE_CHAT_CONFIG", () => {
    it("has WIDGET_ID and WIDGET_PATH", () => {
      expect(LIVE_CHAT_CONFIG.WIDGET_ID).toBeTruthy();
      expect(LIVE_CHAT_CONFIG.WIDGET_PATH).toBeTruthy();
    });

    it("has CUSTOMIZATION with enabled flag", () => {
      expect(LIVE_CHAT_CONFIG.CUSTOMIZATION.enabled).toBeDefined();
    });

    it("has position and colors", () => {
      expect(LIVE_CHAT_CONFIG.CUSTOMIZATION.position).toBe("bottom-right");
      expect(LIVE_CHAT_CONFIG.CUSTOMIZATION.colors).toBeDefined();
    });
  });

  describe("shouldShowLiveChat", () => {
    it("returns boolean", () => {
      expect(typeof shouldShowLiveChat()).toBe("boolean");
    });
  });
});
