import { SecurityService } from "@/lib/security";

describe("SecurityService", () => {
  describe("sanitizeInput", () => {
    it("removes HTML tags", () => {
      expect(SecurityService.sanitizeInput("<script>alert(1)</script>")).not.toContain("<");
      expect(SecurityService.sanitizeInput("Hello <b>World</b>")).toBe("Hello bWorld/b");
    });

    it("removes javascript: protocol", () => {
      expect(SecurityService.sanitizeInput("javascript:evil()")).not.toContain("javascript:");
    });

    it("returns empty for non-string", () => {
      expect(SecurityService.sanitizeInput(123 as any)).toBe("");
    });

    it("trims whitespace", () => {
      expect(SecurityService.sanitizeInput("  safe  ")).toBe("safe");
    });
  });

  describe("validateEmail", () => {
    it("accepts valid emails", () => {
      expect(SecurityService.validateEmail("user@example.com")).toBe(true);
      expect(SecurityService.validateEmail("test+tag@domain.co.uk")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(SecurityService.validateEmail("invalid")).toBe(false);
      expect(SecurityService.validateEmail("@nodomain.com")).toBe(false);
      expect(SecurityService.validateEmail("noatsign.com")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("rejects password with fewer than 4 criteria", () => {
      const r = SecurityService.validatePassword("abc"); // length, lowercase only
      expect(r.isValid).toBe(false);
      expect(r.feedback.length).toBeGreaterThan(0);
    });

    it("rejects password missing uppercase when score < 4", () => {
      const r = SecurityService.validatePassword("short"); // length + lowercase only = 2
      expect(r.isValid).toBe(false);
    });

    it("accepts strong password with 4+ criteria", () => {
      const r = SecurityService.validatePassword("StrongP@ss1");
      expect(r.isValid).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(4);
    });
  });

  describe("validateFile", () => {
    it("rejects oversized file", () => {
      const file = new File(["x"], "test.pdf", { type: "application/pdf" });
      Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });
      const result = SecurityService.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("exceeds limit");
    });

    it("rejects disallowed file type", () => {
      const file = new File(["x"], "test.exe", { type: "application/x-msdownload" });
      const result = SecurityService.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("accepts valid PDF", () => {
      const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
      Object.defineProperty(file, "size", { value: 1024 });
      const result = SecurityService.validateFile(file);
      expect(result.isValid).toBe(true);
    });

    it("accepts valid image types", () => {
      const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 });
      const result = SecurityService.validateFile(file);
      expect(result.isValid).toBe(true);
    });
  });
  describe("sanitizeInput edge cases", () => {
    it("handles empty string", () => {
      expect(SecurityService.sanitizeInput("")).toBe("");
    });
  });
});
