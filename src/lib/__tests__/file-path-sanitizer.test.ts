import {
  sanitizeFileName,
  sanitizePathSegment,
  buildSafePath,
  validatePathWithinBase,
} from "@/lib/file-path-sanitizer";

describe("file-path-sanitizer", () => {
  describe("sanitizeFileName", () => {
    it("returns unnamed-file for null/empty", () => {
      expect(sanitizeFileName("")).toBe("unnamed-file");
      expect(sanitizeFileName(null as any)).toBe("unnamed-file");
      expect(sanitizeFileName(undefined as any)).toBe("unnamed-file");
    });

    it("removes path traversal sequences", () => {
      expect(sanitizeFileName("../../../etc/passwd")).not.toContain("..");
    });

    it("replaces path separators with underscore", () => {
      expect(sanitizeFileName("path/to/file.txt")).not.toContain("/");
      expect(sanitizeFileName("path\\to\\file.txt")).not.toContain("\\");
    });

    it("trims and removes leading/trailing dots", () => {
      expect(sanitizeFileName(".hidden")).not.toMatch(/^\./);
    });

    it("keeps safe characters", () => {
      expect(sanitizeFileName("my-file_123.pdf")).toContain("my-file");
    });

    it("limits length to 255 preserving extension", () => {
      const long = "a".repeat(300) + ".pdf";
      const result = sanitizeFileName(long);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith(".pdf")).toBe(true);
    });
  });

  describe("sanitizePathSegment", () => {
    it("returns empty for null/empty", () => {
      expect(sanitizePathSegment("")).toBe("");
      expect(sanitizePathSegment(null as any)).toBe("");
    });

    it("removes path traversal and special chars", () => {
      expect(sanitizePathSegment("../../../segment")).not.toContain("..");
    });

    it("limits segment length to 100", () => {
      expect(sanitizePathSegment("a".repeat(150)).length).toBeLessThanOrEqual(100);
    });
  });

  describe("buildSafePath", () => {
    it("joins sanitized segments with filename", () => {
      const path = buildSafePath(["user", "uploads"], "file.pdf");
      expect(path).toBe("user/uploads/file.pdf");
    });

    it("returns only filename when segments empty", () => {
      const path = buildSafePath([], "file.pdf");
      expect(path).toBe("file.pdf");
    });

    it("filters out empty segments", () => {
      const path = buildSafePath(["user", "", "uploads"], "file.pdf");
      expect(path).not.toContain("//");
    });
  });

  describe("validatePathWithinBase", () => {
    it("returns false for path with ..", () => {
      expect(validatePathWithinBase("base/../other")).toBe(false);
    });

    it("returns false for path starting with ..", () => {
      expect(validatePathWithinBase("../etc/passwd")).toBe(false);
    });

    it("returns true for normal path", () => {
      expect(validatePathWithinBase("base/sub/file")).toBe(true);
    });

    it("returns false when path does not start with base", () => {
      expect(validatePathWithinBase("other/path", "base")).toBe(false);
    });
  });
});
