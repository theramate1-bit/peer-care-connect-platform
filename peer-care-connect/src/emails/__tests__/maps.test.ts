import {
  generateGoogleMapsUrl,
  generateAppleMapsUrl,
  generateMapsUrl,
} from "@/emails/utils/maps";

describe("emails/utils/maps", () => {
  describe("generateGoogleMapsUrl", () => {
    it("returns encoded Google Maps URL", () => {
      const url = generateGoogleMapsUrl("123 High St, London");
      expect(url).toContain("https://maps.google.com");
      expect(url).toContain("q=");
      expect(url).toContain(encodeURIComponent("123 High St, London"));
    });

    it("returns # for empty location", () => {
      expect(generateGoogleMapsUrl("")).toBe("#");
      expect(generateGoogleMapsUrl("   ")).toBe("#");
    });
  });

  describe("generateAppleMapsUrl", () => {
    it("returns encoded Apple Maps URL", () => {
      const url = generateAppleMapsUrl("123 High St, London");
      expect(url).toContain("https://maps.apple.com");
      expect(url).toContain("q=");
    });

    it("returns # for empty location", () => {
      expect(generateAppleMapsUrl("")).toBe("#");
    });
  });

  describe("generateMapsUrl", () => {
    it("returns Apple Maps URL (universal)", () => {
      const url = generateMapsUrl("123 High St");
      expect(url).toContain("maps.apple.com");
    });

    it("returns # for empty location", () => {
      expect(generateMapsUrl("")).toBe("#");
    });
  });
  describe("generateGoogleMapsUrl encoding", () => {
    it("encodes special characters", () => {
      const url = generateGoogleMapsUrl("10 Downing St, London SW1");
      expect(url).toContain("10");
      expect(url).not.toContain(" ");
    });
  });
});
